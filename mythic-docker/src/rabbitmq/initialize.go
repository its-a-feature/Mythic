package rabbitmq

import (
	"fmt"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/grpc"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type QueueHandler func(amqp.Delivery)
type RPCQueueHandler func(amqp.Delivery) interface{}

type RPCQueueStruct struct {
	Exchange   string
	Queue      string
	RoutingKey string
	Handler    RPCQueueHandler
}
type DirectQueueStruct struct {
	Exchange   string
	Queue      string
	RoutingKey string
	Handler    QueueHandler
}

type channelMutex struct {
	Channel       *amqp.Channel
	Mutex         *sync.RWMutex
	NotifyPublish chan amqp.Confirmation
	NotifyReturn  chan amqp.Return
}

type rabbitMQConnection struct {
	conn             *amqp.Connection
	mutex            sync.RWMutex
	addListenerMutex sync.RWMutex
	channelMutexMap  map[string]*channelMutex
	channelMutex     sync.RWMutex
	RPCQueues        []RPCQueueStruct
	DirectQueues     []DirectQueueStruct
}

var RabbitMQConnection rabbitMQConnection

func (r *rabbitMQConnection) AddRPCQueue(input RPCQueueStruct) {
	r.addListenerMutex.Lock()
	r.RPCQueues = append(r.RPCQueues, input)
	r.addListenerMutex.Unlock()
}
func (r *rabbitMQConnection) AddDirectQueue(input DirectQueueStruct) {
	r.addListenerMutex.Lock()
	r.DirectQueues = append(r.DirectQueues, input)
	r.addListenerMutex.Unlock()
}
func (r *rabbitMQConnection) startListeners() {
	exclusiveQueue := true
	for _, rpcQueue := range r.RPCQueues {
		go RabbitMQConnection.ReceiveFromRPCQueue(
			rpcQueue.Exchange,
			rpcQueue.Queue,
			rpcQueue.RoutingKey,
			rpcQueue.Handler,
			exclusiveQueue)
	}
	for _, directQueue := range r.DirectQueues {
		go RabbitMQConnection.ReceiveFromMythicDirectExchange(
			directQueue.Exchange,
			directQueue.Queue,
			directQueue.RoutingKey,
			directQueue.Handler,
			exclusiveQueue)
	}
	go checkContainerStatus()
}

var pushC2StreamingConnectNotification = make(chan int, 100)
var pushC2StreamingDisconnectNotification = make(chan int, 100)

func Initialize() {
	RabbitMQConnection.channelMutexMap = make(map[string]*channelMutex)
	go invalidateAllSpectatorAPITokens()
	go listenForWriteDownloadChunkToLocalDisk()
	go listenForAsyncAgentMessagePostResponseContent()
	for {
		if _, err := RabbitMQConnection.GetConnection(); err == nil {
			// periodically check to make sure containers are online
			RabbitMQConnection.startListeners()
			// initialize the callback graph
			callbackGraph.Initialize()
			// re-spin up listening ports for proxies
			proxyPorts.Initialize()
			// start tracking tasks wait to be fetched
			submittedTasksAwaitingFetching.Initialize()
			updatePushC2CallbackTime()
			// initialize gRPC
			grpc.Initialize(pushC2StreamingConnectNotification, pushC2StreamingDisconnectNotification)
			// start listening for eventing messages
			go listenForEvents()
			go initializeEventGroupCronSchedulesOnStart()
			// start listening for new messages from push c2 profiles, needs gRPC initialized first
			go processAgentMessageFromPushC2()
			go interceptProxyDataToAgentForPushC2()
			go checkIfActiveCallbacksAreAliveForever()
			go listenForPushConnectDisconnectMessages()
			go func() {
				// wait 20s for things to stabilize a bit, then send a startup message
				time.Sleep(time.Second * 30)
				go emitStartupMessages()
			}()
			logging.LogInfo("RabbitMQ Initialized")
			return
		}
		logging.LogInfo("Waiting for RabbitMQ...")
	}
}

func updatePushC2CallbackTime() {
	_, err := database.DB.Exec(`UPDATE callback SET last_checkin=$2 WHERE last_checkin=$1`,
		time.UnixMicro(0), time.Now().UTC())
	if err != nil {
		logging.LogError(err, "Failed to update last checkin time of existing push_c2 callbacks")
	}
}

func emitStartupMessages() {
	operations := []databaseStructs.Operation{}
	if err := database.DB.Select(&operations, `SELECT "name", webhook, id, channel
		FROM operation WHERE complete=false AND deleted=false`); err != nil {
		logging.LogError(err, "Failed to fetch operations, so sending a generic one to everybody")
		RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
			OperationID:      0,
			OperationName:    "",
			OperationWebhook: "",
			OperationChannel: "",
			OperatorUsername: "Mythic",
			Action:           WEBHOOK_TYPE_NEW_STARTUP,
			Data: map[string]interface{}{
				"startup_message": "Mythic Online!",
			},
		})
	} else {
		for _, op := range operations {
			RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
				OperationID:      op.ID,
				OperationName:    op.Name,
				OperationWebhook: op.Webhook,
				OperationChannel: op.Channel,
				OperatorUsername: "Mythic",
				Action:           WEBHOOK_TYPE_NEW_STARTUP,
				Data: map[string]interface{}{
					"startup_message": fmt.Sprintf("Mythic Online for operation %s!", op.Name),
				},
			})
			EventingChannel <- EventNotification{
				Trigger:     eventing.TriggerMythicStart,
				OperationID: op.ID,
			}
		}
	}

}

func invalidateAllSpectatorAPITokens() {
	_, err := database.DB.Exec(`UPDATE apitokens 
		SET deleted=true, active=true WHERE token_type=$1 OR token_type=$2 OR token_type=$3`,
		mythicjwt.AUTH_METHOD_GRAPHQL_SPECTATOR, mythicjwt.AUTH_METHOD_TASK, mythicjwt.AUTH_METHOD_EVENT)
	if err != nil {
		logging.LogError(err, "failed to mark all spectator tokens as deleted and inactive")
	}
}
