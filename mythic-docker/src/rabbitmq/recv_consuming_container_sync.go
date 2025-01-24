package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

// CONSUMING_CONTAINER_SYNC STRUCTS
type ConsumingServicesType string

type ConsumingContainerSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type ConsumingContainerSyncMessage struct {
	ConsumingContainer ConsumingContainerDefinition `json:"consuming_container"`
	ContainerVersion   string                       `json:"container_version"`
}

type ConsumingContainerDefinition struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Type          string   `json:"type"`
	Subscriptions []string `json:"subscriptions"`
}

const (
	CONSUMING_SERVICES_TYPE_LOGGING   ConsumingServicesType = "logging"
	CONSUMING_SERVICES_TYPE_WEBHOOK                         = "webhook"
	CONSUMING_SERVICES_TYPE_EVENTING                        = "eventing"
	CONSUMING_SERVICES_TYPE_SCRIPTING                       = "scripting"
)

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      "mythic_consume_consuming_container_sync",
		RoutingKey: CONSUMING_CONTAINER_SYNC_ROUTING_KEY,
		Handler:    processConsumingContainerSyncMessages,
	})
}

func processConsumingContainerSyncMessages(msg amqp.Delivery) interface{} {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	c2SyncMsg := ConsumingContainerSyncMessage{}

	err := json.Unmarshal(msg.Body, &c2SyncMsg)
	if err != nil {
		logging.LogError(err, "Failed to process consuming container sync message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync consuming container profile %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return ConsumingContainerSyncMessageResponse{Success: false, Error: err.Error()}
	}
	response := ConsumingContainerSyncMessageResponse{}
	if err := consumingServicesSync(c2SyncMsg); err != nil {
		// failed to sync message
		response.Success = false
		response.Error = fmt.Sprintf("Error: %v", err)
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync %s - %s",
			c2SyncMsg.ConsumingContainer.Name, err.Error()), 0, c2SyncMsg.ConsumingContainer.Name,
			database.MESSAGE_LEVEL_WARNING)
	} else {
		// successfully synced
		response.Success = true
	}
	logging.LogDebug("Finished processing consuming container sync message")
	return response

}

func consumingServicesSync(in ConsumingContainerSyncMessage) error {
	//logging.LogDebug("Received connection to c2Sync", "syncMessage", in)
	consumingContainer := databaseStructs.ConsumingContainer{}
	if in.ConsumingContainer.Name == "" {
		logging.LogError(nil, "Can't have consuming container with empty name - bad sync")
		return errors.New("can't have consuming container with empty name - bad sync")
	} else if !isValidContainerVersion(in.ContainerVersion) {
		logging.LogError(nil, "attempting to sync bad consuming container version")
		return errors.New(fmt.Sprintf("Version, %s, isn't supported. The max supported version is %s. \nThis likely means your PyPi or Golang library is out of date and should be updated.", in.ContainerVersion, validContainerVersionMax))
	}
	if err := database.DB.Get(&consumingContainer, `SELECT * FROM consuming_container WHERE "name"=$1`, in.ConsumingContainer.Name); err != nil {
		// this means we don't have the c2 profile, so we need to create it and all the associated components
		logging.LogDebug("Failed to find consuming container, syncing new data")
		consumingContainer.Name = in.ConsumingContainer.Name
		consumingContainer.ContainerRunning = true
		consumingContainer.Description = in.ConsumingContainer.Description
		consumingContainer.Deleted = false
		consumingContainer.Type = in.ConsumingContainer.Type
		consumingContainer.Subscriptions = GetMythicJSONArrayFromStruct(in.ConsumingContainer.Subscriptions)
		if statement, err := database.DB.PrepareNamed(`INSERT INTO consuming_container 
			("name",container_running,description,deleted,type,subscriptions) 
			VALUES (:name, :container_running, :description, :deleted, :type, :subscriptions) 
			RETURNING id`,
		); err != nil {
			logging.LogError(err, "Failed to create new consuming_container statement")
			return err
		} else {
			if err = statement.Get(&consumingContainer.ID, consumingContainer); err != nil {
				logging.LogError(err, "Failed to create new consuming_container")
				return err
			} else {
				logging.LogDebug("New container", "consuming_container", consumingContainer)
			}
		}
	} else {
		// the payload exists in the database, so we need to go down the track of updating/adding/removing information
		logging.LogDebug("Found consuming_container", "consuming_container", consumingContainer)
		consumingContainer.ContainerRunning = true
		consumingContainer.Description = in.ConsumingContainer.Description
		consumingContainer.Deleted = false
		consumingContainer.Type = in.ConsumingContainer.Type
		consumingContainer.Subscriptions = GetMythicJSONArrayFromStruct(in.ConsumingContainer.Subscriptions)
		_, err = database.DB.NamedExec(`UPDATE consuming_container SET 
			container_running=:container_running, description=:description, deleted=:deleted,
			type=:type, subscriptions=:subscriptions
			WHERE id=:id`, consumingContainer,
		)
		if err != nil {
			logging.LogError(err, "Failed to update consuming container in database")
			return err
		}
	}
	go SendAllOperationsMessage(fmt.Sprintf("Successfully synced %s with container version %s",
		consumingContainer.Name, in.ContainerVersion), 0, "debug", database.MESSAGE_LEVEL_DEBUG)
	go database.ResolveAllOperationsMessage(getDownContainerMessage(consumingContainer.Name), 0)
	checkContainerStatusAddConsumingContainerChannel <- consumingContainer
	// update eventgroup consumingcontainer mappings
	eventing.UpdateEventGroupConsumingContainersMappingByConsumingContainer(consumingContainer)
	go CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(consumingContainer.Name)
	return nil
}
