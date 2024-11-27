package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
	"strings"
)

type MythicRPCC2UpdateStatusMessage struct {
	C2Profile             string `json:"c2_profile"`     // required
	InternalServerRunning bool   `json:"server_running"` // required
	Error                 string `json:"error"`
}
type MythicRPCC2UpdateStatusMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_C2_UPDATE_STATUS,
		RoutingKey: MYTHIC_RPC_C2_UPDATE_STATUS,
		Handler:    processMythicRPCC2UpdateStatus,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_ADD_COMMAND
func MythicRPCC2UpdateStatus(input MythicRPCC2UpdateStatusMessage) MythicRPCC2UpdateStatusMessageResponse {
	response := MythicRPCC2UpdateStatusMessageResponse{
		Success: false,
	}
	c2Profile := databaseStructs.C2profile{Name: input.C2Profile, Running: input.InternalServerRunning}
	_, err := database.DB.NamedExec(`UPDATE c2profile SET running=:running WHERE name=:name`, c2Profile)
	if err != nil {
		response.Error = err.Error()
	} else {
		response.Success = true
	}
	if input.Error != "" {
		if strings.HasPrefix(input.Error, "Server already") {
			go SendAllOperationsMessage(fmt.Sprintf("Update from C2 Profile %s:\n%s\n", input.C2Profile, input.Error),
				0, fmt.Sprintf("%s_error", input.C2Profile), database.MESSAGE_LEVEL_DEBUG)
		} else {
			go SendAllOperationsMessage(fmt.Sprintf("Error from C2 Profile %s:\n%s\n", input.C2Profile, input.Error),
				0, fmt.Sprintf("%s_error", input.C2Profile), database.MESSAGE_LEVEL_WARNING)
		}
	}
	return response
}

func processMythicRPCC2UpdateStatus(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCC2UpdateStatusMessage{}
	responseMsg := MythicRPCC2UpdateStatusMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCC2UpdateStatus(incomingMessage)
	}
	return responseMsg
}
