package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_START_SERVER STRUCTS

type C2_START_SERVER_STATUS = string

type C2StartServerMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2StartServerMessageResponse struct {
	Success               bool   `json:"success"`
	Error                 string `json:"error"`
	Message               string `json:"message"`
	InternalServerRunning bool   `json:"server_running"`
}

func RestartC2ServerAfterUpdate(c2ProfileName string, sendNotifications bool) {
	go func() {
		c2Profile := databaseStructs.C2profile{Name: c2ProfileName}
		err := database.DB.Get(&c2Profile, `SELECT id FROM c2profile WHERE name=$1`, c2ProfileName)
		if err != nil {
			go SendAllOperationsMessage("Failed to find C2 Profile", 0, "host_file", database.MESSAGE_LEVEL_WARNING)
		}
		if sendNotifications {
			go SendAllOperationsMessage("Stopping C2 Profile after hosting new file...", 0, "host_file", database.MESSAGE_LEVEL_INFO)
		}
		stopC2ProfileResponse, err := RabbitMQConnection.SendC2RPCStopServer(C2StopServerMessage{
			Name: c2ProfileName,
		})
		UpdateC2ProfileRunningStatus(c2Profile, stopC2ProfileResponse.InternalServerRunning)
		if err != nil {
			logging.LogError(err, "Failed to send RPC call to c2 profile in C2HostFileMessageWebhook", "c2_profile", c2ProfileName)
			if sendNotifications {
				go SendAllOperationsMessage("Failed to stop c2 profile after hosting file", 0, "host_file", database.MESSAGE_LEVEL_WARNING)
			}
			return
		}
		if !stopC2ProfileResponse.Success {
			if stopC2ProfileResponse.Error != "Server not running" {
				if sendNotifications {
					go SendAllOperationsMessage(stopC2ProfileResponse.Error, 0, "", database.MESSAGE_LEVEL_WARNING)
				}
				return
			}
		}
		if sendNotifications {
			go SendAllOperationsMessage("Starting C2 Profile after hosting new file...", 0, "host_file", database.MESSAGE_LEVEL_INFO)
		}
		startC2ProfileResponse, err := RabbitMQConnection.SendC2RPCStartServer(C2StartServerMessage{
			Name: c2ProfileName,
		})
		UpdateC2ProfileRunningStatus(c2Profile, startC2ProfileResponse.InternalServerRunning)
		if err != nil {
			logging.LogError(err, "Failed to send RPC call to c2 profile in C2HostFileMessageWebhook", "c2_profile", c2ProfileName)
			if sendNotifications {
				go SendAllOperationsMessage("Failed to start c2 profile after hosting file", 0, "", database.MESSAGE_LEVEL_WARNING)
			}
			return
		}
		if !startC2ProfileResponse.Success {
			if sendNotifications {
				go SendAllOperationsMessage(startC2ProfileResponse.Error, 0, "", database.MESSAGE_LEVEL_WARNING)
			}
			return
		}
		if sendNotifications {
			go SendAllOperationsMessage("Successfully restarted C2 Profile after hosting a file", 0, "host_file", database.MESSAGE_LEVEL_INFO)
		}
	}()
}
func (r *rabbitMQConnection) SendC2RPCStartServer(startServer C2StartServerMessage) (*C2StartServerMessageResponse, error) {
	c2StartServerResponse := C2StartServerMessageResponse{}
	exclusiveQueue := true
	opsecBytes, err := json.Marshal(startServer)
	if err != nil {
		logging.LogError(err, "Failed to convert startServer to JSON", "startServer", startServer)
		return &c2StartServerResponse, err
	}
	logging.LogDebug("Sending start server request", "startServer", startServer)
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCStartServerRoutingKey(startServer.Name),
		opsecBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return &c2StartServerResponse, err
	}
	err = json.Unmarshal(response, &c2StartServerResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse start server response back to struct", "response", response)
		return &c2StartServerResponse, err
	}
	return &c2StartServerResponse, nil
}
