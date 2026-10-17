package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:          MYTHIC_EXCHANGE,
		Queue:             PT_TASK_PROCESS_RESPONSE_RESPONSE,
		RoutingKey:        PT_TASK_PROCESS_RESPONSE_RESPONSE,
		Handler:           processPtTaskProcessResponseMessages,
		Authentication:    RabbitMQAuthenticationContainerAuthContext,
		Scopes:            []string{mythicjwt.SCOPE_TASK_WRITE},
		ContainerIdentity: extractTaskResponseIdentity,
	})
}

func processPtTaskProcessResponseMessages(msg amqp.Delivery) {
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		logging.LogError(err, "Failed to get auth headers")
		return
	}
	payloadMsg := PTTaskProcessResponseMessageResponse{}
	err = json.Unmarshal(msg.Body, &payloadMsg)
	if err != nil {
		logging.LogError(err, "Failed to process PTTaskProcessResponseMessageResponse into struct")
		return
	}
	ownedTaskID := 0
	if err := database.DB.Get(&ownedTaskID, `SELECT id FROM task WHERE id=$1 AND operation_id=$2`,
		payloadMsg.TaskID, authContext.OperationID); err != nil {
		logging.LogError(err, "Refusing process response for task outside the authenticated operation")
		return
	}
	// now process the create_tasking response body to update the task
	expireAPITokensForTask(ownedTaskID)
	if !payloadMsg.Success {
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process response message for task %d:\n%s", payloadMsg.TaskID, payloadMsg.Error),
			0, "", database.MESSAGE_LEVEL_INFO, true)
	} else {
		logging.LogDebug("Successfully processed process response for task", "task_id", payloadMsg.TaskID)
	}

}
