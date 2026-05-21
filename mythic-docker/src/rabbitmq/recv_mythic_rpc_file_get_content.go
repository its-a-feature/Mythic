package rabbitmq

import (
	"encoding/json"
	"os"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
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
		Scopes:     []string{mythicjwt.SCOPE_FILE_READ},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCFileGetContent(input MythicRPCFileGetContentMessage, authContext RabbitMQAuthContext) MythicRPCFileGetContentMessageResponse {
	response := MythicRPCFileGetContentMessageResponse{
		Success: false,
	}
	file := databaseStructs.Filemeta{
		AgentFileID: input.AgentFileID,
	}
	err := database.DB.Get(&file, `SELECT 
    	id, path 
		FROM filemeta 
		WHERE agent_file_id=$1 AND operation_id=$2`, input.AgentFileID, authContext.OperationID)
	if err != nil {
		response.Error = err.Error()
		return response
	}

	diskFile, err := os.OpenFile(file.Path, os.O_RDONLY, 0644)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	fileInfo, err := diskFile.Stat()
	if err != nil {
		response.Error = err.Error()
		return response
	}
	fileContents := make([]byte, fileInfo.Size())
	_, err = diskFile.Read(fileContents)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	response.Content = fileContents
	response.Success = true
	return response
}
func processMythicRPCFileGetContent(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileGetContentMessage{}
	responseMsg := MythicRPCFileGetContentMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCFileGetContent(incomingMessage, authContext)
}
