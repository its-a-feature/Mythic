package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

// PAYLOAD_BUILD STRUCTS

type PTOnNewCallbackResponse struct {
	AgentCallbackID string `json:"agent_callback_id"`
	Success         bool   `json:"success"`
	Error           string `json:"error"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:          MYTHIC_EXCHANGE,
		Queue:             PT_ON_NEW_CALLBACK_RESPONSE_ROUTING_KEY,
		RoutingKey:        PT_ON_NEW_CALLBACK_RESPONSE_ROUTING_KEY,
		Handler:           processOnNewCallbackResponse,
		Authentication:    RabbitMQAuthenticationContainerAuthContext,
		Scopes:            []string{mythicjwt.SCOPE_CALLBACK_WRITE},
		ContainerIdentity: extractOnNewCallbackResponseIdentity,
	})

}

// handle payload build response messages coming back on the queue
func processOnNewCallbackResponse(msg amqp.Delivery) {
	logging.LogInfo("got message", "routingKey", msg.RoutingKey)
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		logging.LogError(err, "Failed to get auth headers")
		return
	}
	newCallbackResponse := PTOnNewCallbackResponse{}
	err = json.Unmarshal(msg.Body, &newCallbackResponse)
	if err != nil {
		logging.LogError(err, "Failed to process new callback response message")
		return
	}
	//logging.LogInfo("got build response", "buildMsg", payloadBuildResponse)
	if newCallbackResponse.Success {
		return // don't need to send any alert messages on success
	}
	databaseCallback := databaseStructs.Callback{}
	err = database.DB.Get(&databaseCallback, `SELECT 
			callback.display_id, callback.operation_id
			FROM callback 
			WHERE agent_callback_id=$1 AND operation_id=$2
			LIMIT 1`, newCallbackResponse.AgentCallbackID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to get payload from the database")
		return
	}
	go SendAllOperationsMessage(fmt.Sprintf("Failed to handle onNewCallback processing for callback %d\n%s", databaseCallback.DisplayID, newCallbackResponse.Error),
		databaseCallback.OperationID, "", database.MESSAGE_LEVEL_INFO, true)
}
