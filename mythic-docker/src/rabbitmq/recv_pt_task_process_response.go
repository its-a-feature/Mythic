package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_TASK_PROCESS_RESPONSE_RESPONSE,
		RoutingKey: PT_TASK_PROCESS_RESPONSE_RESPONSE,
		Handler:    processPtTaskProcessResponseMessages,
	})
}

func processPtTaskProcessResponseMessages(msg amqp.Delivery) {
	payloadMsg := PTTaskProcessResponseMessageResponse{}
	if err := json.Unmarshal(msg.Body, &payloadMsg); err != nil {
		logging.LogError(err, "Failed to process PTTaskProcessResponseMessageResponse into struct")
	} else {
		// now process the create_tasking response body to update the task
		if !payloadMsg.Success {
			go SendAllOperationsMessage(fmt.Sprintf("Failed to process response message for task %d:\n%s", payloadMsg.TaskID, payloadMsg.Error),
				0, "", database.MESSAGE_LEVEL_WARNING)
		} else {
			logging.LogDebug("Successfully processed process response for task", "task_id", payloadMsg.TaskID)
		}
	}
}
