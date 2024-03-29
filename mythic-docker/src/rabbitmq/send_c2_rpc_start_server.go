package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"

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
		if sendNotifications {
			go SendAllOperationsMessage("Stopping C2 Profile after hosting new file...", 0, "host_file", database.MESSAGE_LEVEL_INFO)
		}
		stopC2ProfileResponse, err := RabbitMQConnection.SendC2RPCStopServer(C2StopServerMessage{
			Name: c2ProfileName,
		})
		if err != nil {
			logging.LogError(err, "Failed to send RPC call to c2 profile in C2HostFileMessageWebhook", "c2_profile", c2ProfileName)
			if sendNotifications {
				go SendAllOperationsMessage("Failed to stop c2 profile after hosting file", 0, "host_file", database.MESSAGE_LEVEL_WARNING)
			}
			return
		}
		if !stopC2ProfileResponse.Success {
			if sendNotifications {
				go SendAllOperationsMessage(stopC2ProfileResponse.Error, 0, "", database.MESSAGE_LEVEL_WARNING)
			}
			return
		}
		if sendNotifications {
			go SendAllOperationsMessage("Starting C2 Profile after hosting new file...", 0, "host_file", database.MESSAGE_LEVEL_INFO)
		}
		startC2ProfileResponse, err := RabbitMQConnection.SendC2RPCStartServer(C2StartServerMessage{
			Name: c2ProfileName,
		})
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
	if opsecBytes, err := json.Marshal(startServer); err != nil {
		logging.LogError(err, "Failed to convert startServer to JSON", "startServer", startServer)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCStartServerRoutingKey(startServer.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2StartServerResponse); err != nil {
		logging.LogError(err, "Failed to parse start server response back to struct", "response", response)
		return nil, err
	} else {
		return &c2StartServerResponse, nil
	}
}
