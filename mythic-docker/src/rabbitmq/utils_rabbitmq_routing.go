package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
)

type rpcResponse struct {
	Body []byte
	Err  error
}

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
func GetPtCheckIfCallbacksAliveRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_CHECK_IF_CALLBACKS_ALIVE_ROUTING_KEY)
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
func GetPtRPCDynamicQueryBuildParameterFunctionRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_RPC_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION)
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
func GetPtCommandHelpRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, PT_COMMAND_HELP_FUNCTION)
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
	return fmt.Sprintf("%s_%s", container, CONTAINER_RPC_GET_FILE)
}
func GetC2RPCRemoveFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, CONTAINER_RPC_REMOVE_FILE)
}
func GetC2RPCListFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, CONTAINER_RPC_LIST_FILE)
}
func GetC2RPCWriteFileRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, CONTAINER_RPC_WRITE_FILE)
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

func GetConsumingContainerRPCReSyncRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, CONSUMING_CONTAINER_RESYNC_ROUTING_KEY)
}
func GetEventingContainerCustomFunctionRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, EVENTING_CUSTOM_FUNCTION)
}
func GetEventingContainerTaskInterceptRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, EVENTING_TASK_INTERCEPT)
}
func GetEventingContainerResponseInterceptRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, EVENTING_RESPONSE_INTERCEPT)
}
func GetEventingContainerConditionalCheckRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, EVENTING_CONDITIONAL_CHECK)
}
func GetAuthContainerGetIDPRedirectRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, AUTH_RPC_GET_IDP_REDIRECT)
}
func GetAuthContainerGetNonIDPRedirectRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, AUTH_RPC_GET_NONIDP_REDIRECT)
}
func GetAuthContainerGetIDPMetadataRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, AUTH_RPC_GET_IDP_METADATA)
}
func GetAuthContainerProcessIDPResponseRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, AUTH_RPC_PROCESS_IDP_RESPONSE)
}
func GetAuthContainerProcessNonIDPResponseRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, AUTH_RPC_PROCESS_NONIDP_RESPONSE)
}
func GetAuthContainerGetNonIDPMetadataRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, AUTH_RPC_GET_NONIDP_METADATA)
}

func GetContainerOnStartRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, CONTAINER_ON_START)
}
func GetCustomBrowserExportFunctionRoutingKey(container string) string {
	return fmt.Sprintf("%s_%s", container, CUSTOMBROWSER_EXPORT_FUNCTION)
}

func (r *rabbitMQConnection) GetConnection() (*amqp.Connection, error) {
	// use a mutex lock around getting the connection because we don't want to accidentally have leaking connections
	//	in case two functions try to instantiate new connections at the same time
	r.mutex.Lock()
	defer r.mutex.Unlock()
	if r.conn != nil && !r.conn.IsClosed() {
		return r.conn, nil
	}
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
func (r *rabbitMQConnection) SendStructMessage(exchange string, queue string, correlationId string, body interface{}, ignoreErrorMessage bool) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return err
	}
	return r.SendMessage(exchange, queue, correlationId, jsonBody, ignoreErrorMessage)
}
func (r *rabbitMQConnection) SendRPCStructMessage(exchange string, queue string, body interface{}, retryPolicy RPCRetryPolicy) ([]byte, error) {
	if inputBytes, err := json.Marshal(body); err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", body)
		return nil, err
	} else {
		return r.SendRPCMessage(exchange, queue, inputBytes, true, retryPolicy)
	}
}

func (r *rabbitMQConnection) getPublisherChannel() (*amqp.Channel, chan amqp.Confirmation, chan amqp.Return, error) {
	if r.publisherChannel != nil && !r.publisherChannel.IsClosed() {
		return r.publisherChannel, r.publisherConfirm, r.publisherReturn, nil
	}
	conn, err := r.GetConnection()
	if err != nil {
		return nil, nil, nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		return nil, nil, nil, err
	}
	if err = ch.Confirm(false); err != nil {
		ch.Close()
		return nil, nil, nil, err
	}
	r.publisherChannel = ch
	r.publisherConfirm = ch.NotifyPublish(make(chan amqp.Confirmation, 1))
	r.publisherReturn = ch.NotifyReturn(make(chan amqp.Return, 1))
	return r.publisherChannel, r.publisherConfirm, r.publisherReturn, nil
}

func (r *rabbitMQConnection) resetPublisherChannel(ch *amqp.Channel) {
	if ch != nil && !ch.IsClosed() {
		ch.Close()
	}
	if r.publisherChannel == ch {
		r.publisherChannel = nil
		r.publisherConfirm = nil
		r.publisherReturn = nil
	}
}

func (r *rabbitMQConnection) SendMessage(exchange string, queue string, correlationId string, body []byte, ignoreErrormessage bool) error {
	// to send a normal message out to a direct queue set:
	// exchange: MYTHIC_EXCHANGE
	// queue: which routing key is listening (this is the direct name)
	// correlation_id: empty string
	for attempt := 0; attempt < 3; attempt++ {
		r.publisherMutex.Lock()
		ch, confirmChannel, notifyReturnChannel, err := r.getPublisherChannel()
		if err != nil {
			logging.LogError(err, "Failed to get rabbitmq publisher channel", "queue", queue)
			r.publisherMutex.Unlock()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		msg := amqp.Publishing{
			ContentType:   "application/json",
			CorrelationId: correlationId,
			Body:          body,
		}
		err = ch.Publish(
			exchange, // exchange
			queue,    // routing key
			true,     // mandatory
			false,    // immediate
			msg,      // publishing
		)
		if err != nil {
			logging.LogError(err, "there was an error publishing a message", "queue", queue)
			r.resetPublisherChannel(ch)
			r.publisherMutex.Unlock()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		select {
		case ntf := <-confirmChannel:
			if !ntf.Ack {
				err = errors.New("Failed to deliver message, not ACK-ed by receiver")
				logging.LogError(err, "failed to deliver message to exchange/queue, notifyPublish")
				r.resetPublisherChannel(ch)
				r.publisherMutex.Unlock()
				time.Sleep(RPC_TIMEOUT)
				continue
			}
		case ret := <-notifyReturnChannel:
			err = errors.New(getMeaningfulRabbitmqError(ret))
			if !ignoreErrormessage {
				logging.LogError(err, "failed to deliver message to exchange/queue, NotifyReturn", "errorCode", ret.ReplyCode, "errorText", ret.ReplyText)
			}
			r.resetPublisherChannel(ch)
			r.publisherMutex.Unlock()
			time.Sleep(RPC_TIMEOUT)
			continue
		case <-time.After(RPC_TIMEOUT):
			err = errors.New("Message delivery confirmation timed out")
			logging.LogError(err, "message delivery confirmation to exchange/queue timed out")
			r.resetPublisherChannel(ch)
			r.publisherMutex.Unlock()
			continue
		}
		r.publisherMutex.Unlock()
		return nil
	}
	if !ignoreErrormessage {
		logging.LogError(errors.New("failed 3 times"), "failed 3 times", "queue", queue)
	}
	return errors.New(fmt.Sprintf("failed 3 times to send to queue %s", queue))
}
func (r *rabbitMQConnection) getRPCTimeout(retryPolicy RPCRetryPolicy) time.Duration {
	if retryPolicy == RPC_RETRY_POLICY_CUSTOM_TIMEOUT && utils.MythicConfig.CustomRPCTimeout > 0 {
		return utils.MythicConfig.CustomRPCTimeout
	}
	return RPC_TIMEOUT
}

func (r *rabbitMQConnection) getRPCClientLocked(exchange string, exclusiveQueue bool) (*amqp.Channel, chan amqp.Confirmation, chan amqp.Return, error) {
	if r.rpcChannel != nil && !r.rpcChannel.IsClosed() {
		if err := r.declareRPCExchangeLocked(r.rpcChannel, exchange); err != nil {
			r.resetRPCClientLocked(r.rpcChannel, err)
			return nil, nil, nil, err
		}
		return r.rpcChannel, r.rpcConfirm, r.rpcReturn, nil
	}
	conn, err := r.GetConnection()
	if err != nil {
		return nil, nil, nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		return nil, nil, nil, err
	}
	if err = ch.Confirm(false); err != nil {
		ch.Close()
		return nil, nil, nil, err
	}
	confirmChannel := ch.NotifyPublish(make(chan amqp.Confirmation, 1))
	notifyReturnChannel := ch.NotifyReturn(make(chan amqp.Return, 1))
	msgs, err := ch.Consume(
		"amq.rabbitmq.reply-to", // queue name
		"",                      // consumer
		true,                    // auto-ack
		exclusiveQueue,          // exclusive
		false,                   // no local
		false,                   // no wait
		nil,                     // args
	)
	if err != nil {
		ch.Close()
		return nil, nil, nil, err
	}
	r.rpcChannel = ch
	r.rpcConfirm = confirmChannel
	r.rpcReturn = notifyReturnChannel
	if r.rpcPending == nil {
		r.rpcPending = make(map[string]chan rpcResponse)
	}
	r.rpcExchanges = make(map[string]bool)
	if err = r.declareRPCExchangeLocked(ch, exchange); err != nil {
		r.resetRPCClientLocked(ch, err)
		return nil, nil, nil, err
	}
	go r.listenForRPCReplies(ch, msgs)
	return r.rpcChannel, r.rpcConfirm, r.rpcReturn, nil
}

func (r *rabbitMQConnection) declareRPCExchangeLocked(ch *amqp.Channel, exchange string) error {
	if r.rpcExchanges == nil {
		r.rpcExchanges = make(map[string]bool)
	}
	if r.rpcExchanges[exchange] {
		return nil
	}
	err := ch.ExchangeDeclare(
		exchange, // exchange name
		"direct", // type of exchange, ex: topic, fanout, direct, etc
		true,     // durable
		true,     // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,      // arguments
	)
	if err == nil {
		r.rpcExchanges[exchange] = true
	}
	return err
}

func (r *rabbitMQConnection) listenForRPCReplies(ch *amqp.Channel, msgs <-chan amqp.Delivery) {
	for d := range msgs {
		r.rpcClientMutex.Lock()
		responseChannel := r.rpcPending[d.CorrelationId]
		if responseChannel != nil {
			delete(r.rpcPending, d.CorrelationId)
		}
		r.rpcClientMutex.Unlock()
		if responseChannel != nil {
			responseChannel <- rpcResponse{Body: d.Body}
		}
	}
	r.rpcClientMutex.Lock()
	if r.rpcChannel == ch {
		r.resetRPCClientLocked(ch, errors.New("rpc reply consumer stopped"))
	}
	r.rpcClientMutex.Unlock()
}

func (r *rabbitMQConnection) resetRPCClientLocked(ch *amqp.Channel, err error) {
	if ch != nil && !ch.IsClosed() {
		ch.Close()
	}
	if r.rpcChannel == ch {
		for correlationID, responseChannel := range r.rpcPending {
			select {
			case responseChannel <- rpcResponse{Err: err}:
			default:
			}
			delete(r.rpcPending, correlationID)
		}
		r.rpcChannel = nil
		r.rpcConfirm = nil
		r.rpcReturn = nil
		r.rpcExchanges = nil
	}
}

func (r *rabbitMQConnection) removePendingRPCResponse(correlationID string) {
	r.rpcClientMutex.Lock()
	delete(r.rpcPending, correlationID)
	r.rpcClientMutex.Unlock()
}

func (r *rabbitMQConnection) publishRPCMessage(exchange string, queue string, correlationID string, body []byte, exclusiveQueue bool, responseChannel chan rpcResponse) error {
	r.rpcClientMutex.Lock()
	defer r.rpcClientMutex.Unlock()
	ch, confirmChannel, notifyReturnChannel, err := r.getRPCClientLocked(exchange, exclusiveQueue)
	if err != nil {
		logging.LogError(err, "Failed to get rabbitmq rpc channel", "queue", queue)
		return err
	}
	r.rpcPending[correlationID] = responseChannel
	msg := amqp.Publishing{
		ContentType:   "application/json",
		CorrelationId: correlationID,
		Body:          body,
		ReplyTo:       "amq.rabbitmq.reply-to",
	}
	err = ch.Publish(
		exchange, // exchange
		queue,    // routing key
		true,     // mandatory
		false,    // immediate
		msg,      // publishing
	)
	if err != nil {
		delete(r.rpcPending, correlationID)
		logging.LogError(err, "there was an error publishing an rpc message", "queue", queue)
		r.resetRPCClientLocked(ch, err)
		return err
	}
	timeoutChannel := time.After(RPC_TIMEOUT)
	for {
		select {
		case ntf := <-confirmChannel:
			if !ntf.Ack {
				err = errors.New("failed to deliver message, not ACK-ed by receiver")
				delete(r.rpcPending, correlationID)
				logging.LogError(err, "failed to deliver message to exchange/queue, notifyPublish", "queue", queue)
				r.resetRPCClientLocked(ch, err)
				return err
			}
			return nil
		case ret := <-notifyReturnChannel:
			if ret.CorrelationId != correlationID {
				continue
			}
			err = errors.New(getMeaningfulRabbitmqError(ret))
			delete(r.rpcPending, correlationID)
			r.resetRPCClientLocked(ch, err)
			return err
		case <-timeoutChannel:
			err = errors.New("message delivery confirmation timed out in SendRPCMessage")
			delete(r.rpcPending, correlationID)
			logging.LogError(err, "message delivery confirmation to exchange/queue timed out when sending", "queue", queue)
			r.resetRPCClientLocked(ch, err)
			return err
		}
	}
}

func (r *rabbitMQConnection) SendRPCMessage(exchange string, queue string, body []byte, exclusiveQueue bool, retryPolicy RPCRetryPolicy) ([]byte, error) {
	var finalError error
	timeout := r.getRPCTimeout(retryPolicy)
	for attempt := 0; attempt < 3; attempt++ {
		correlationID := uuid.NewString()
		responseChannel := make(chan rpcResponse, 1)
		err := r.publishRPCMessage(exchange, queue, correlationID, body, exclusiveQueue, responseChannel)
		if err != nil {
			finalError = err
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		//logging.LogDebug("Sent RPC message", "queue", queue)
		select {
		case response := <-responseChannel:
			if response.Err != nil {
				finalError = response.Err
				logging.LogError(response.Err, "rpc channel failed while waiting for response", "queue", queue)
				if retryPolicy != RPC_RETRY_POLICY_RETRY_ON_TIMEOUT {
					return nil, response.Err
				}
				time.Sleep(RPC_TIMEOUT)
				continue
			}
			//logging.LogDebug("Got RPC Reply", "queue", queue)
			return response.Body, nil
		case <-time.After(timeout):
			r.removePendingRPCResponse(correlationID)
			err = errors.New("rpc response timed out")
			finalError = err
			logging.LogError(err, "message delivery confirmation to exchange/queue timed out when receiving", "queue", queue)
			if retryPolicy != RPC_RETRY_POLICY_RETRY_ON_TIMEOUT {
				return nil, err
			}
			continue
		}
	}
	logging.LogError(finalError, "failed 3 times")
	return nil, finalError
}
func (r *rabbitMQConnection) ReceiveFromMythicDirectExchange(exchange string, queue string, routingKey string, handler QueueHandler, exclusiveQueue bool) {
	// exchange is a direct exchange
	// queue is where the messages get sent to (local name)
	// routingKey is the specific direct topic we're interested in for the exchange
	// handler processes the messages we get on our queue
	for {
		conn, err := r.GetConnection()
		if err != nil {
			logging.LogError(err, "Failed to connect to rabbitmq", "retry_wait_time", RPC_TIMEOUT)
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		ch, err := conn.Channel()
		if err != nil {
			logging.LogError(err, "Failed to open rabbitmq channel", "retry_wait_time", RPC_TIMEOUT)
			time.Sleep(RPC_TIMEOUT)
			continue
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
			ch.Close()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		q, err := ch.QueueDeclare(
			queue,          // name, queue
			false,          // durable
			true,           // delete when unused
			exclusiveQueue, // exclusive
			false,          // no-wait
			nil,            // arguments
		)
		if err != nil {
			logging.LogError(err, "Failed to declare queue", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			ch.Close()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		err = ch.QueueBind(
			q.Name,     // queue name
			routingKey, // routing key
			exchange,   // exchange name
			false,      // nowait
			nil,        // arguments
		)
		if err != nil {
			logging.LogError(err, "Failed to bind to queue to receive messages", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			ch.Close()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		msgs, err := ch.Consume(
			q.Name, // queue name
			"",     // consumer
			true,   // auto-ack
			false,  // exclusive
			false,  // no local
			false,  // no wait
			nil,    // args
		)
		if err != nil {
			logging.LogError(err, "Failed to start consuming on queue", "queue", q.Name)
			ch.Close()
			time.Sleep(RETRY_CONNECT_DELAY)
			continue
		}
		forever := make(chan bool)
		go func() {
			for d := range msgs {
				//logging.LogDebug("got direct message", "queue", q.Name, "msg", d.Body)
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
func (r *rabbitMQConnection) ReceiveFromRPCQueue(exchange string, queue string, routingKey string, handler RPCQueueHandler, exclusiveQueue bool) {
	for {
		conn, err := r.GetConnection()
		if err != nil {
			logging.LogError(err, "Failed to connect to rabbitmq", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		ch, err := conn.Channel()
		if err != nil {
			logging.LogError(err, "Failed to open rabbitmq channel", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			time.Sleep(RPC_TIMEOUT)
			continue
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
			logging.LogError(err, "Failed to declare exchange", "exchange", exchange, "exchange_type", "direct", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			ch.Close()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		q, err := ch.QueueDeclare(
			queue,          // name, queue
			true,           // durable
			true,           // delete when unused
			exclusiveQueue, // exclusive
			false,          // no-wait
			nil,            // arguments
		)
		if err != nil {
			logging.LogError(err, "Failed to declare queue", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			ch.Close()
			time.Sleep(RPC_TIMEOUT)
			continue
		}
		err = ch.QueueBind(
			q.Name,     // queue name
			routingKey, // routing key
			exchange,   // exchange name
			false,      // nowait
			nil,        // arguments
		)
		if err != nil {
			logging.LogError(err, "Failed to bind to queue to receive messages", "retry_wait_time", RPC_TIMEOUT, "queue", queue)
			ch.Close()
			time.Sleep(RPC_TIMEOUT)
			continue
		}

		forever := make(chan bool)
		go func() {
			for {
				if ch.IsClosed() {
					logging.LogError(nil, "channel is closed", "queue", q.Name)
					break
				}
				msgs, err := ch.Consume(
					q.Name,         // queue name
					"",             // consumer
					false,          // auto-ack
					exclusiveQueue, // exclusive
					false,          // no local
					false,          // no wait
					nil,            // args
				)
				if err != nil {
					logging.LogError(err, "Failed to start consuming messages on queue", "queue", q.Name)
					ch.Close()
					time.Sleep(RETRY_CONNECT_DELAY)
					break
				}
				for d := range msgs {
					if ch.IsClosed() {
						logging.LogError(nil, "channel is closed", "queue", q.Name)
						forever <- true
						return
					}
					responseMsg := handler(d)
					responseMsgJson, err := json.Marshal(responseMsg)
					if err != nil {
						logging.LogError(err, "Failed to generate JSON for rpc response", "queue", queue)
						continue
					}
					err = ch.Publish(
						"",        // exchange
						d.ReplyTo, //routing key
						true,      // mandatory
						false,     // immediate
						amqp.Publishing{
							ContentType:   "application/json",
							Body:          responseMsgJson,
							CorrelationId: d.CorrelationId,
						})
					if err != nil {
						logging.LogError(err, "Failed to send message", "queue", queue)
						continue
					}
					err = ch.Ack(d.DeliveryTag, false)
					if err != nil {
						logging.LogError(err, "Failed to Ack message", "queue", queue)
					}
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
