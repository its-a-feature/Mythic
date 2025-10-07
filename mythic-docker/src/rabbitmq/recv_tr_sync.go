package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

// TR_SYNC STRUCTS

type TrSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type TrSyncMessage struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	Author           string `json:"author"`
	ContainerVersion string `json:"container_version"`
	SemVer           string `json:"semver"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      "mythic_consume_tr_sync",
		RoutingKey: TR_SYNC_ROUTING_KEY,
		Handler:    processTrSyncMessages,
	})
}

func processTrSyncMessages(msg amqp.Delivery) interface{} {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	trSyncMsg := TrSyncMessage{}
	response := TrSyncMessageResponse{Success: false}
	err := json.Unmarshal(msg.Body, &trSyncMsg)
	if err != nil {
		logging.LogError(err, "Failed to process tr sync message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync translation container - %s", err.Error()), 0, trSyncMsg.Name, database.MESSAGE_LEVEL_INFO, true)
		return response
	}
	err = trSync(trSyncMsg)
	if err != nil {
		// failed to sync message
		response.Success = false
		response.Error = fmt.Sprintf("Error: %v", err)
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync %s - %s", trSyncMsg.Name, err.Error()), 0, trSyncMsg.Name, database.MESSAGE_LEVEL_INFO, true)
	} else {
		// successfully synced
		response.Success = true
		go SendAllOperationsMessage(fmt.Sprintf("Successfully synced %s with container version %s", trSyncMsg.Name, trSyncMsg.ContainerVersion), 0, "debug", database.MESSAGE_LEVEL_DEBUG, false)
		go database.ResolveAllOperationsMessage(getDownContainerMessage(trSyncMsg.Name), 0)
		logging.LogDebug("Successfully synced", "service", trSyncMsg.Name)
	}
	return response
}

func trSync(in TrSyncMessage) error {
	//logging.LogDebug("Received connection to c2Sync", "syncMessage", in)
	newTranslationContainer := false
	translationDatabase := databaseStructs.Translationcontainer{
		Name:             in.Name,
		Deleted:          false,
		ContainerRunning: true,
		Description:      in.Description,
		Author:           in.Author,
		SemVer:           in.SemVer,
	}
	if in.Name == "" {
		logging.LogError(nil, "Can't have translation container with empty name - bad sync")
		return errors.New("Can't have translation container with empty name - bad sync")
	}
	if !isValidContainerVersion(in.ContainerVersion) {
		logging.LogError(nil, "attempting to sync bad translation container version")
		return errors.New(fmt.Sprintf("Version, %s, isn't supported. The max supported version is %s. \nThis likely means your PyPi or Golang library is out of date and should be updated.", in.ContainerVersion, validContainerVersionMax))
	}
	err := database.DB.Get(&translationDatabase, `SELECT id 
		FROM translationcontainer
		WHERE "name" = $1`, in.Name)
	if errors.Is(err, sql.ErrNoRows) {
		newTranslationContainer = true
	}
	_, err = database.DB.NamedExec(`INSERT INTO translationcontainer 
    	("name", deleted, container_running, description, author, semver) VALUES (:name, :deleted, :container_running, :description, :author, :semver)
    	ON CONFLICT ("name") DO UPDATE SET deleted=false, container_running=true, description=:description, author=:author, semver=:semver`, translationDatabase)
	if err != nil {
		logging.LogError(err, "Failed to sync translation container")
		return err
	}
	err = database.DB.Get(&translationDatabase.ID, `SELECT id FROM translationcontainer WHERE "name"=$1`, translationDatabase.Name)
	if err != nil {
		logging.LogError(err, "Failed to get translation information back after creation")
		return err
	}
	checkContainerStatusAddTrChannel <- translationDatabase
	go CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(translationDatabase.Name)
	if newTranslationContainer {
		go reSyncPayloadTypes()
	}
	return nil
}
