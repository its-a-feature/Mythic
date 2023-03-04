package rabbitmq

import (
	"encoding/json"
	"os"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileGetContentMessage struct {
	AgentFileID string `json:"file_id"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCFileGetContentMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Content []byte `json:"content"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILE_GET_CONTENT,    // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_FILE_GET_CONTENT,    // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCFileGetContent, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

//MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCFileGetContent(input MythicRPCFileGetContentMessage) MythicRPCFileGetContentMessageResponse {
	response := MythicRPCFileGetContentMessageResponse{
		Success: false,
	}
	file := databaseStructs.Filemeta{
		AgentFileID: input.AgentFileID,
	}
	if err := database.DB.Get(&file, `SELECT id, path FROM filemeta WHERE agent_file_id=$1`, input.AgentFileID); err != nil {
		response.Error = err.Error()
		return response
	}

	if diskFile, err := os.OpenFile(file.Path, os.O_RDONLY, 0644); err != nil {
		response.Error = err.Error()
		return response
	} else if fileInfo, err := diskFile.Stat(); err != nil {
		response.Error = err.Error()
		return response
	} else {
		fileContents := make([]byte, fileInfo.Size())
		if _, err := diskFile.Read(fileContents); err != nil {
			response.Error = err.Error()
			return response
		} else {
			response.Content = fileContents
			response.Success = true
			return response
		}
	}
}
func processMythicRPCFileGetContent(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileGetContentMessage{}
	responseMsg := MythicRPCFileGetContentMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCFileGetContent(incomingMessage)
	}
	return responseMsg
}
