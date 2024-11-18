package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type ContainerOnStartMessageResponse struct {
	ContainerName string `json:"container_name"`
	Stdout        string `json:"stdout"`
	Stderr        string `json:"stderr"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      CONTAINER_ON_START_RESPONSE,
		RoutingKey: CONTAINER_ON_START_RESPONSE,
		Handler:    processContainerOnStartMessageResponse,
	})
}

func processContainerOnStartMessageResponse(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	containerStartResponse := ContainerOnStartMessageResponse{}

	err := json.Unmarshal(msg.Body, &containerStartResponse)
	if err != nil {
		logging.LogError(err, "Failed to process container on start response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process container on start response:\n %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	if containerStartResponse.Stderr != "" {
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process %s on start response:\n %s",
			containerStartResponse.ContainerName, containerStartResponse.Stderr),
			0, fmt.Sprintf("%s_on_start", containerStartResponse.ContainerName), database.MESSAGE_LEVEL_WARNING)
	}
	if containerStartResponse.Stdout != "" {
		go SendAllOperationsMessage(fmt.Sprintf("Container %s on start response:\n %s",
			containerStartResponse.ContainerName, containerStartResponse.Stdout),
			0, fmt.Sprintf("%s_on_start", containerStartResponse.ContainerName), database.MESSAGE_LEVEL_INFO)
	}
}
