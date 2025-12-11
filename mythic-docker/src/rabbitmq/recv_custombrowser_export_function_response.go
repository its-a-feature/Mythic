package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

// TR_SYNC STRUCTS

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      CUSTOMBROWSER_EXPORT_FUNCTION_RESPONSE,
		RoutingKey: CUSTOMBROWSER_EXPORT_FUNCTION_RESPONSE,
		Handler:    processCbExportFunctionResponseMessages,
	})
}

func processCbExportFunctionResponseMessages(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	response := ExportFunctionMessageResponse{}
	err := json.Unmarshal(msg.Body, &response)
	if err != nil {
		logging.LogError(err, "Failed to process custom browser export response message")
		return
	}
	if !response.Success {
		if response.TreeType == "" {
			logging.LogError(nil, "Custom Browser Export Function failed in target container")
		} else {
			go SendAllOperationsMessage(fmt.Sprintf("%s Export Function Response:\nFailed to export from browser:\n%s", response.TreeType, response.Error),
				response.OperationID, "custombrowser_export_function", database.MESSAGE_LEVEL_INFO, true)
		}

	} else if response.CompletionMessage != "" {
		go SendAllOperationsMessage(fmt.Sprintf("%s Export Function Response: \n%s", response.TreeType, response.CompletionMessage),
			response.OperationID, "custombrowser_export_function", database.MESSAGE_LEVEL_INFO, false)
	}
}
