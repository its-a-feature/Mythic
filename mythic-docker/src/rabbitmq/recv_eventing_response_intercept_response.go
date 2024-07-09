package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
	"time"
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
	})
}

func processEventingResponseInterceptResponse(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	input := ResponseInterceptMessageResponse{}
	err := json.Unmarshal(msg.Body, &input)
	if err != nil {
		logging.LogError(err, "Failed to process eventing response intercept response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing response intercept response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	_, err = database.DB.Exec(`UPDATE response SET response=$1, eventstepinstance_id=$2, timestamp=$4 WHERE id=$3`,
		input.Response, input.EventStepInstanceID, input.ResponseID, time.Now().UTC())
	if err != nil {
		logging.LogError(err, "Failed to process eventing response intercept response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing response intercept response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
	}
	taskID := 0
	err = database.DB.Get(&taskID, `SELECT task.id 
		FROM task
		JOIN response ON response.task_id = task.id
		WHERE response.id = $1`, input.ResponseID)
	if err != nil {
		logging.LogError(err, "failed to get taskID")
	} else {
		_, err = database.DB.Exec(`UPDATE task SET has_intercepted_response=true WHERE id=$1`, taskID)
		if err != nil {
			logging.LogError(err, "failed to update task to set has_intercepted_response=true")
		}
	}
	EventingChannel <- EventNotification{
		Trigger:               eventing.TriggerResponseInterceptResponse,
		EventStepInstanceID:   input.EventStepInstanceID,
		Outputs:               input.Outputs,
		ActionStdout:          input.StdOut,
		ActionStderr:          input.StdErr,
		ActionSuccess:         input.Success,
		ResponseID:            input.ResponseID,
		ResponseInterceptData: input.Response,
	}
}
