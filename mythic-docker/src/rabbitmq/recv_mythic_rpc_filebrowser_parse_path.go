package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileBrowserParsePathMessage struct {
	Path string `json:"path"`
}
type MythicRPCFileBrowserParsePathMessageResponse struct {
	Success      bool               `json:"success"`
	Error        string             `json:"error"`
	AnalyzedPath utils.AnalyzedPath `json:"analyzed_path"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILEBROWSER_PARSE_PATH,
		RoutingKey: MYTHIC_RPC_FILEBROWSER_PARSE_PATH,
		Handler:    processMythicRPCFileBrowserParsePath,
	})
}

// Endpoint: MYTHIC_RPC_FILEBROWSER_CREATE
func MythicRPCFileBrowserParsePath(input MythicRPCFileBrowserParsePathMessage) MythicRPCFileBrowserParsePathMessageResponse {
	response := MythicRPCFileBrowserParsePathMessageResponse{
		Success: false,
	}
	parsedPathData, err := utils.SplitFilePathGetHost(input.Path, "", []string{})
	if err != nil {
		response.Error = err.Error()
		return response
	}
	response.AnalyzedPath = parsedPathData
	response.Success = true
	return response
}
func processMythicRPCFileBrowserParsePath(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileBrowserParsePathMessage{}
	responseMsg := MythicRPCFileBrowserParsePathMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCFileBrowserParsePath(incomingMessage)
	}
	return responseMsg
}
