package rabbitmq

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
	"net"
	"strings"
	"sync"
	"time"
)

// payload routing key functions
func GetPtBuildRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_BUILD_ROUTING_KEY)
}
func GetPTRPCReSyncRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_RPC_RESYNC_ROUTING_KEY)
}
func GetPtC2BuildRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_BUILD_C2_ROUTING_KEY)
}
func GetPtOnNewCallbackRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_ON_NEW_CALLBACK)
}
func GetPtTaskCreateRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_TASK_CREATE_TASKING)
}
func GetPtTaskOpsecPreCheckRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_TASK_OPSEC_PRE_CHECK)
}
func GetPtTaskOpsecPostCheckRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_TASK_OPSEC_POST_CHECK)
}
func GetPtRPCDynamicQueryFunctionRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_RPC_COMMAND_DYNAMIC_QUERY_FUNCTION)
}
func GetPtRPCTypedArrayParseRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_RPC_COMMAND_TYPEDARRAY_PARSE)
}
func GetPtTaskCompletionHandlerRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_TASK_COMPLETION_FUNCTION)
}
func GetPtTaskProcessResponseRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_TASK_PROCESS_RESPONSE)
}

// c2 rpc routing key functions
func GetC2RPCOpsecChecksRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_OPSEC_CHECKS_ROUTING_KEY)
}
func GetC2RPCConfigChecksRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_CONFIG_CHECK_ROUTING_KEY)
}
func GetC2RPCGetIOCRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_GET_IOC_ROUTING_KEY)
}
func GetC2RPCSampleMessageRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_SAMPLE_MESSAGE_ROUTING_KEY)
}
func GetC2RPCReSyncRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_RESYNC_ROUTING_KEY)
}
func GetC2RPCRedirectorRulesRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_REDIRECTOR_RULES_ROUTING_KEY)
}
func GetC2RPCStartServerRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_START_SERVER_ROUTING_KEY)
}
func GetC2RPCStopServerRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_STOP_SERVER_ROUTING_KEY)
}
func GetC2RPCGetServerDebugOutputRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_GET_SERVER_DEBUG_OUTPUT)
}
func GetC2RPCHostFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_HOST_FILE)
}
func GetC2RPCGetFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_GET_FILE)
}
func GetC2RPCRemoveFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_REMOVE_FILE)
}
func GetC2RPCListFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_LIST_FILE)
}
func GetC2RPCWriteFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, C2_RPC_WRITE_FILE)
}

func GetTrRPCReSyncRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, TR_RPC_RESYNC_ROUTING_KEY)
}
func GetTrRPCEncryptBytesRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, TR_RPC_ENCRYPT_BYTES)
}
func GetTrRPCDecryptBytesRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, TR_RPC_DECRYPT_BYTES)
}

func (r *rabbitMQConnection) GetConnection() (*amqp.Connection, error) {
	// use a mutex lock around getting the connection because we don't want to accidentally have leaking connections
	//	in case two functions try to instantiate new connections at the same time
	r.mutex.Lock()
	defer r.mutex.Unlock()
	if r.conn != nil && !r.conn.IsClosed() {
		return r.conn, nil
	} else {
		for {
			logging.LogInfo("Attempting to connect to rabbitmq")
			conn, err := amqp.DialConfig(fmt.Sprintf("amqp://%s:%s@%s:%d/%s",
				utils.MythicConfig.RabbitmqUser,
				utils.MythicConfig.RabbitmqPassword,
				utils.MythicConfig.RabbitmqHost,
				utils.MythicConfig.RabbitmqPort,
				utils.MythicConfig.RabbitmqVHost),
				amqp.Config{
					Dial: func(network, addr string) (net.Conn, error) {
						return net.DialTimeout(network, addr, 10*time.Second)
					},
				},
			)
			if err != nil {
				logging.LogError(err, "Failed to connect to rabbitmq")
				time.Sleep(RETRY_CONNECT_DELAY)
				continue
			}
			r.conn = conn
			return conn, nil
		}
	}
}
func (r *rabbitMQConnection) SendMessageMutexChannel(queue string, exchange string, correlationId string, body []byte, ignoreErrormessage bool) error {
	// lock overall to make sure we don't double-create the entry
	r.channelMutex.Lock()
	if _, ok := r.channelMutexMap[exchange+queue]; !ok {
		newMutex := sync.RWMutex{}
		r.channelMutexMap[exchange+queue] = &channelMutex{
			Mutex: &newMutex,
		}
	}
	r.channelMutex.Unlock()
	// lock the new entry to make sure we don't double-create the channel
	r.channelMutexMap[exchange+queue].Mutex.Lock()
	defer r.channelMutexMap[exchange+queue].Mutex.Unlock()
	if r.channelMutexMap[exchange+queue].Channel == nil || r.channelMutexMap[exchange+queue].Channel.IsClosed() {
		conn, err := r.GetConnection()
		if err != nil {
			logging.LogError(err, "Failed to get rabbitmq connection")
			return err
		}
		ch, err := conn.Channel()
		if err != nil {
			logging.LogError(err, "Failed to get new channel")
			return err
		}
		err = ch.Confirm(false)
		if err != nil {
			logging.LogError(err, "Failed to set confirm status on new channel")
			return err
		}
		r.channelMutexMap[exchange+queue].Channel = ch
		r.channelMutexMap[exchange+queue].NotifyPublish = r.channelMutexMap[exchange+queue].Channel.NotifyPublish(make(chan amqp.Confirmation, 1))
		r.channelMutexMap[exchange+queue].NotifyReturn = r.channelMutexMap[exchange+queue].Channel.NotifyReturn(make(chan amqp.Return, 1))
	}
	msg := amqp.Publishing{
		DeliveryMode:  amqp.Persistent,
		ContentType:   "application/json",
		CorrelationId: correlationId,
		Body:          body,
	}
	ctx, cancel := context.WithTimeout(context.Background(), RPC_TIMEOUT)
	defer cancel()
	if err := r.channelMutexMap[exchange+queue].Channel.PublishWithContext(
		ctx,
		exchange, // exchange
		queue,    // routing key
		true,     // mandatory
		false,    // immediate
		msg,      // publishing
	); err != nil {
		r.channelMutexMap[exchange+queue].Channel.Close()
		r.channelMutexMap[exchange+queue].Channel = nil
		logging.LogError(err, "there was an error publishing a message", "queue", queue)
		return err
	}
	select {
	case ntf := <-r.channelMutexMap[exchange+queue].NotifyPublish:
		if !ntf.Ack {
			err := errors.New("failed to deliver message, not ACK-ed by receiver")
			logging.LogError(err, "failed to deliver message to exchange/queue, notifyPublish")
			r.channelMutexMap[exchange+queue].Channel.Close()
			r.channelMutexMap[exchange+queue].Channel = nil
			return err
		}

	case ret := <-r.channelMutexMap[exchange+queue].NotifyReturn:
		err := errors.New(getMeaningfulRabbitmqError(ret))
		r.channelMutexMap[exchange+queue].Channel.Close()
		r.channelMutexMap[exchange+queue].Channel = nil
		if !ignoreErrormessage {
			logging.LogError(err, "NotifyReturn error")
			return err
		}

	case <-time.After(RPC_TIMEOUT):
		err := errors.New("message delivery confirmation timed out")
		logging.LogError(err, "no notify publish or notify return, assuming success and continuing", "queue", queue)
		r.channelMutexMap[exchange+queue].Channel.Close()
		r.channelMutexMap[exchange+queue].Channel = nil
		return nil
	}
	return nil
}
func (r *rabbitMQConnection) SendStructMessage(exchange string, queue string, correlationId string, body interface{}, ignoreErrorMessage bool) error {
	if jsonBody, err := json.Marshal(body); err != nil {
		return err
	} else {
		return r.SendMessage(exchange, queue, correlationId, jsonBody, ignoreErrorMessage)
	}
}
func (r *rabbitMQConnection) SendRPCStructMessage(exchange string, queue string, body interface{}) ([]byte, error) {
	if inputBytes, err := json.Marshal(body); err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", body)
		return nil, err
	} else {
		return r.SendRPCMessage(exchange, queue, inputBytes, true)
	}
}
func (r *rabbitMQConnection) SendMessage(exchange string, queue string, correlationId string, body []byte, ignoreErrormessage bool) error {
	// to send a normal message out to a direct queue set:
	// exchange: MYTHIC_EXCHANGE
	// queue: which routing key is listening (this is the direct name)
	// correlation_id: empty string
	err := r.SendMessageMutexChannel(queue, exchange, correlationId, body, ignoreErrormessage)
	if err != nil && exchange == MYTHIC_TOPIC_EXCHANGE {
		return nil
	} else {
		return err
	}

}
func (r *rabbitMQConnection) SendRPCMessage(exchange string, queue string, body []byte, exclusiveQueue bool) ([]byte, error) {
	if conn, err := r.GetConnection(); err != nil {
		return nil, err
	} else if ch, err := conn.Channel(); err != nil {
		logging.LogError(err, "Failed to open rabbitmq channel")
		return nil, err
	} else if err := ch.Confirm(false); err != nil {
		logging.LogError(err, "Channel could not be put into confirm mode")
		ch.Close()
		return nil, err
	} else if err = ch.ExchangeDeclare(
		exchange, // exchange name
		"direct", // type of exchange, ex: topic, fanout, direct, etc
		true,     // durable
		true,     // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,      // arguments
	); err != nil {
		logging.LogError(err, "Failed to declare exchange", "exchange", exchange, "exchange_type", "direct", "retry_wait_time", RETRY_CONNECT_DELAY)
		return nil, err
	} else if msgs, err := ch.Consume(
		"amq.rabbitmq.reply-to", // queue name
		"",                      // consumer
		true,                    // auto-ack
		exclusiveQueue,          // exclusive
		false,                   // no local
		false,                   // no wait
		nil,                     // args
	); err != nil {
		logging.LogError(err, "Failed to start consuming for RPC replies")
		ch.Close()
		return nil, err
	} else {
		defer ch.Close()
		msg := amqp.Publishing{
			ContentType:   "application/json",
			CorrelationId: uuid.NewString(),
			Body:          body,
			ReplyTo:       "amq.rabbitmq.reply-to",
		}
		if err = ch.Publish(
			exchange, // exchange
			queue,    // routing key
			true,     // mandatory
			false,    // immediate
			msg,      // publishing
		); err != nil {
			logging.LogError(err, "there was an error publishing a message", "queue", queue)
			return nil, err
		}
		select {
		case ntf := <-ch.NotifyPublish(make(chan amqp.Confirmation, 1)):
			if !ntf.Ack {
				err := errors.New("Failed to deliver message, not ACK-ed by receiver")
				logging.LogError(err, "failed to deliver message to exchange/queue, notifyPublish")
				return nil, err
			}
		case ret := <-ch.NotifyReturn(make(chan amqp.Return)):
			err := errors.New(getMeaningfulRabbitmqError(ret))
			logging.LogError(err, "failed to deliver message to exchange/queue, NotifyReturn", "errorCode", ret.ReplyCode, "errorText", ret.ReplyText)
			return nil, err
		case <-time.After(RPC_TIMEOUT):
			err := errors.New("message delivery confirmation timed out in SendRPCMessage")
			logging.LogError(err, "message delivery confirmation to exchange/queue timed out")
			return nil, err
		}
		logging.LogDebug("Sent RPC message", "queue", queue)
		select {
		case m := <-msgs:
			logging.LogDebug("Got RPC Reply", "queue", queue)
			return m.Body, nil
		case <-time.After(RPC_TIMEOUT):
			logging.LogError(nil, "Timeout reached waiting for RPC reply")
			return nil, errors.New("Timeout reached waiting for RPC reply")
		}
	}

	/*
		_, err = ch.QueueDeclarePassive(
			queue, // name, queue
			false, // durable
			true,  // delete when unused
			true,  // exclusive
			false, // no-wait
			nil,   // arguments
		)
		if err != nil {
			logging.LogError(err, "Failed to declare queue, RPC endpoint doesn't exist", "retry_wait_time", RETRY_CONNECT_DELAY)
			return nil, err
		}*/
}
func (r *rabbitMQConnection) ReceiveFromMythicDirectExchange(exchange string, queue string, routingKey string, handler QueueHandler, exclusiveQueue bool) {
	// exchange is a direct exchange
	// queue is where the messages get sent to (local name)
	// routingKey is the specific direct topic we're interested in for the exchange
	// handler processes the messages we get on our queue
	for {
		if conn, err := r.GetConnection(); err != nil {
			logging.LogError(err, "Failed to connect to rabbitmq", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if ch, err := conn.Channel(); err != nil {
			logging.LogError(err, "Failed to open rabbitmq channel", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if err = ch.ExchangeDeclare(
			exchange, // exchange name
			"direct", // type of exchange, ex: topic, fanout, direct, etc
			true,     // durable
			true,     // auto-deleted
			false,    // internal
			false,    // no-wait
			nil,      // arguments
		); err != nil {
			logging.LogError(err, "Failed to declare exchange", "exchange", exchange, "exchange_type", "direct", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if q, err := ch.QueueDeclare(
			queue,          // name, queue
			false,          // durable
			true,           // delete when unused
			exclusiveQueue, // exclusive
			false,          // no-wait
			nil,            // arguments
		); err != nil {
			logging.LogError(err, "Failed to declare queue", "retry_wait_time", RETRY_CONNECT_DELAY)
			ch.Close()
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if err = ch.QueueBind(
			q.Name,     // queue name
			routingKey, // routing key
			exchange,   // exchange name
			false,      // nowait
			nil,        // arguments
		); err != nil {
			logging.LogError(err, "Failed to bind to queue to receive messages", "retry_wait_time", RETRY_CONNECT_DELAY)
			ch.Close()
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if msgs, err := ch.Consume(
			q.Name, // queue name
			"",     // consumer
			false,  // auto-ack
			false,  // exclusive
			false,  // no local
			false,  // no wait
			nil,    // args
		); err != nil {
			logging.LogError(err, "Failed to start consuming on queue", "queue", q.Name)
			ch.Close()
		} else {
			forever := make(chan bool)
			go func() {
				for d := range msgs {
					//logging.LogDebug("got direct message", "queue", q.Name, "msg", d.Body)
					go handler(d)
					if err = ch.Ack(d.DeliveryTag, false); err != nil {
						logging.LogError(err, "Failed to Ack message")
					}
				}
				forever <- true
			}()
			logging.LogInfo("Started listening for messages", "exchange", exchange, "queue", queue, "routingKey", routingKey)
			<-forever
			ch.Close()
			logging.LogError(nil, "Stopped listening for messages", "exchange", exchange, "queue", queue, "routingKey", routingKey)
		}

	}
}
func (r *rabbitMQConnection) ReceiveFromRPCQueue(exchange string, queue string, routingKey string, handler RPCQueueHandler, exclusiveQueue bool) {
	for {
		if conn, err := r.GetConnection(); err != nil {
			logging.LogError(err, "Failed to connect to rabbitmq", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if ch, err := conn.Channel(); err != nil {
			logging.LogError(err, "Failed to open rabbitmq channel", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if err = ch.ExchangeDeclare(
			exchange, // exchange name
			"direct", // type of exchange, ex: topic, fanout, direct, etc
			true,     // durable
			true,     // auto-deleted
			false,    // internal
			false,    // no-wait
			nil,      // arguments
		); err != nil {
			logging.LogError(err, "Failed to declare exchange", "exchange", exchange, "exchange_type", "direct", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if q, err := ch.QueueDeclare(
			queue,          // name, queue
			false,          // durable
			true,           // delete when unused
			exclusiveQueue, // exclusive
			false,          // no-wait
			nil,            // arguments
		); err != nil {
			logging.LogError(err, "Failed to declare queue", "retry_wait_time", RETRY_CONNECT_DELAY)
			ch.Close()
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if err = ch.QueueBind(
			q.Name,     // queue name
			routingKey, // routing key
			exchange,   // exchange name
			false,      // nowait
			nil,        // arguments
		); err != nil {
			logging.LogError(err, "Failed to bind to queue to receive messages", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			ch.Close()
			continue
		} else if msgs, err := ch.Consume(
			q.Name,         // queue name
			"",             // consumer
			false,          // auto-ack
			exclusiveQueue, // exclusive
			false,          // no local
			false,          // no wait
			nil,            // args
		); err != nil {
			logging.LogError(err, "Failed to start consuming messages on queue", "queue", q.Name)
			ch.Close()
			continue
		} else {
			forever := make(chan bool)
			go func() {
				for d := range msgs {
					responseMsg := handler(d)
					if responseMsgJson, err := json.Marshal(responseMsg); err != nil {
						logging.LogError(err, "Failed to generate JSON for getFile response")
						continue
					} else if err = ch.Publish(
						"",        // exchange
						d.ReplyTo, //routing key
						true,      // mandatory
						false,     // immediate
						amqp.Publishing{
							ContentType:   "application/json",
							Body:          responseMsgJson,
							CorrelationId: d.CorrelationId,
						}); err != nil {
						logging.LogError(err, "Failed to send message")
					} else if err = ch.Ack(d.DeliveryTag, false); err != nil {
						logging.LogError(err, "Failed to Ack message")
					}
				}
				forever <- true
			}()
			logging.LogInfo("Started listening for rpc messages", "exchange", exchange, "queue", queue, "routingKey", routingKey)
			<-forever
			ch.Close()
			logging.LogError(nil, "Stopped listening for messages", "exchange", exchange, "queue", queue, "routingKey", routingKey)
		}

	}
}
func (r *rabbitMQConnection) CheckConsumerExists(exchange string, queue string, exclusiveQueue bool) (bool, error) {
	//logging.LogDebug("checking queue existence", "queue", queue)
	conn, err := r.GetConnection()
	if err != nil {
		logging.LogError(err, "Failed to connect to rabbitmq", "retry_wait_time", RETRY_CONNECT_DELAY)
		return false, err
	}
	ch, err := conn.Channel()
	if err != nil {
		logging.LogError(err, "Failed to open rabbitmq channel")
		return false, err
	}
	defer ch.Close()
	if err = ch.Confirm(false); err != nil {
		logging.LogError(err, "Channel could not be put into confirm mode")
		return false, err
	}
	err = ch.ExchangeDeclare(
		exchange, // exchange name
		"direct", // type of exchange, ex: topic, fanout, direct, etc
		true,     // durable
		true,     // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,      // arguments
	)
	if err != nil {
		logging.LogError(err, "Failed to declare exchange", "exchange", exchange, "exchange_type", "direct", "retry_wait_time", RETRY_CONNECT_DELAY)
		return false, err
	}

	if _, err := ch.QueueDeclarePassive(
		queue,          // name, queue
		false,          // durable
		true,           // delete when unused
		exclusiveQueue, // exclusive
		false,          // no-wait
		nil,            // arguments
	); err != nil {
		errorMessage := err.Error()
		//logging.LogError(err, "Error when checking for queue")
		if strings.Contains(errorMessage, "Exception (405)") {
			return true, nil
		} else if strings.Contains(errorMessage, "Exception (404)") {
			return false, nil
		} else {
			logging.LogError(err, "Unknown error (not 404 or 405) when checking for container existence")
			return false, err
		}
	} else {
		return true, nil
	}
}
func (r *rabbitMQConnection) GetNumberOfConsumersDirectChannels(exchange string, kind string, queue string) (uint, error) {
	//logging.LogDebug("checking queue existence", "queue", queue)
	conn, err := r.GetConnection()
	if err != nil {
		return 0, err
	}
	ch, err := conn.Channel()
	if err != nil {
		logging.LogError(err, "Failed to open rabbitmq channel")
		return 0, err
	}
	defer ch.Close()
	err = ch.Confirm(false)
	if err != nil {
		logging.LogError(err, "Channel could not be put into confirm mode")
		return 0, err
	}
	err = ch.ExchangeDeclare(
		exchange, // exchange name
		kind,     // type of exchange, ex: topic, fanout, direct, etc
		true,     // durable
		true,     // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,      // arguments
	)
	if err != nil {
		logging.LogError(err, "Failed to declare exchange", "exchange", MYTHIC_TOPIC_EXCHANGE, "exchange_type", "topic", "retry_wait_time", RETRY_CONNECT_DELAY)
		return 0, err

	}
	q, err := ch.QueueDeclare(
		queue, // name, queue
		false, // durable
		true,  // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)
	if err != nil {
		logging.LogError(err, "Unknown error (not 404 or 405) when checking for container existence")
		return 0, err
	}
	err = ch.QueueBind(
		q.Name,   // queue name
		queue,    // routing key
		exchange, // exchange name
		false,    // nowait
		nil,      // arguments
	)
	if err != nil {
		logging.LogError(err, "Failed to bind to queue to receive messages", "retry_wait_time", RETRY_CONNECT_DELAY)
		return 0, err
	}
	return uint(q.Consumers), nil

}
func (r *rabbitMQConnection) ReceiveFromMythicDirectTopicExchange(exchange string, queue string, routingKey string, handler QueueHandler, exclusiveQueue bool) {
	// exchange is a direct exchange
	// queue is where the messages get sent to (local name)
	// routingKey is the specific direct topic we're interested in for the exchange
	// handler processes the messages we get on our queue
	for {
		if conn, err := r.GetConnection(); err != nil {
			logging.LogError(err, "Failed to connect to rabbitmq", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if ch, err := conn.Channel(); err != nil {
			logging.LogError(err, "Failed to open rabbitmq channel", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if err = ch.ExchangeDeclare(
			exchange, // exchange name
			"topic",  // type of exchange, ex: topic, fanout, direct, etc
			true,     // durable
			true,     // auto-deleted
			false,    // internal
			false,    // no-wait
			nil,      // arguments
		); err != nil {
			logging.LogError(err, "Failed to declare exchange", "exchange", exchange, "exchange_type", "direct", "retry_wait_time", RETRY_CONNECT_DELAY)
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if q, err := ch.QueueDeclare(
			"",             // name, queue
			false,          // durable
			true,           // delete when unused
			exclusiveQueue, // exclusive
			false,          // no-wait
			nil,            // arguments
		); err != nil {
			logging.LogError(err, "Failed to declare queue", "retry_wait_time", RETRY_CONNECT_DELAY)
			ch.Close()
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if err = ch.QueueBind(
			q.Name,     // queue name
			routingKey, // routing key
			exchange,   // exchange name
			false,      // nowait
			nil,        // arguments
		); err != nil {
			logging.LogError(err, "Failed to bind to queue to receive messages", "retry_wait_time", RETRY_CONNECT_DELAY)
			ch.Close()
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		} else if msgs, err := ch.Consume(
			q.Name, // queue name
			"",     // consumer
			true,   // auto-ack
			false,  // exclusive
			false,  // no local
			false,  // no wait
			nil,    // args
		); err != nil {
			logging.LogError(err, "Failed to start consuming on queue", "queue", q.Name)
			ch.Close()
		} else {
			forever := make(chan bool)
			go func() {
				for d := range msgs {
					go handler(d)
				}
				forever <- true
			}()
			logging.LogInfo("Started listening for messages", "exchange", exchange, "queue", queue, "routingKey", routingKey)
			<-forever
			ch.Close()
			logging.LogError(nil, "Stopped listening for messages", "exchange", exchange, "queue", queue, "routingKey", routingKey)
		}

	}
}
func (r *rabbitMQConnection) CheckPayloadTypeContainerExists(name string) (bool, error) {
	exclusiveQueue := true
	return r.CheckConsumerExists(MYTHIC_EXCHANGE, GetPtBuildRoutingKey(name), !exclusiveQueue)
}
func (r *rabbitMQConnection) CheckC2ProfileContainerExists(name string) (bool, error) {
	exclusiveQueue := true
	return r.CheckConsumerExists(MYTHIC_EXCHANGE, GetC2RPCStartServerRoutingKey(name), exclusiveQueue)
}
func getMeaningfulRabbitmqError(ret amqp.Return) string {
	switch ret.ReplyCode {
	case 312:
		return fmt.Sprintf("#No RabbitMQ Route for %s. Is the container online (./mythic-cli status)?\n#If the container is online, there might be an issue within the container processing the request (./mythic-cli logs [container name]). ", ret.RoutingKey)
	default:
		return fmt.Sprintf("#Failed to deliver message to exchange/queue. Error code: %d, Error Text: %s", ret.ReplyCode, ret.ReplyText)
	}
}
