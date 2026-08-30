package rabbitmq

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type ResponseInterceptMessageResponse struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id" mapstructure:"eventstepinstance_id"`
	ResponseID          int                    `json:"response_id" mapstructure:"response_id"`
	Success             bool                   `json:"success" mapstructure:"success"`
	StdOut              string                 `json:"stdout" mapstructure:"stdout"`
	StdErr              string                 `json:"stderr" mapstructure:"stderr"`
	Outputs             map[string]interface{} `json:"outputs" mapstructure:"outputs"`
	Response            string                 `json:"response" mapstructure:"response"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      EVENTING_RESPONSE_INTERCEPT_RESPONSE,
		RoutingKey: EVENTING_RESPONSE_INTERCEPT_RESPONSE,
		Handler:    processEventingResponseInterceptResponse,
		Scopes:     []string{},
	})
}

func processEventingResponseInterceptResponse(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	input := ResponseInterceptMessageResponse{}
	err := json.Unmarshal(msg.Body, &input)
	if err != nil {
		logging.LogError(err, "Failed to process eventing response intercept response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing response intercept response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_INFO, true)
		return
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		logging.LogError(err, "Failed to get eventing response intercept response auth headers")
		return
	}
	_, err = database.DB.Exec(`UPDATE response SET response=$1, eventstepinstance_id=$2, timestamp=$4 WHERE id=$3 AND operation_id=$5`,
		input.Response, input.EventStepInstanceID, input.ResponseID, time.Now().UTC(), authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to process eventing response intercept response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing response intercept response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_INFO, true)
	}
	taskID := 0
	err = database.DB.Get(&taskID, `SELECT task.id 
		FROM task
		JOIN response ON response.task_id = task.id
		WHERE response.id = $1 AND response.operation_id=$2`, input.ResponseID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "failed to get taskID")
	} else {
		_, err = database.DB.Exec(`UPDATE task SET has_intercepted_response=true WHERE id=$1 AND operation_id=$2`, taskID, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "failed to update task to set has_intercepted_response=true")
		}
	}
	EventingChannel <- EventNotification{
		Trigger:               eventing.TriggerResponseInterceptResponse,
		EventStepInstanceID:   input.EventStepInstanceID,
		OperatorID:            authContext.OperatorID,
		OperationID:           authContext.OperationID,
		Outputs:               input.Outputs,
		ActionStdout:          input.StdOut,
		ActionStderr:          input.StdErr,
		ActionSuccess:         input.Success,
		ResponseID:            input.ResponseID,
		ResponseInterceptData: input.Response,
	}
}
