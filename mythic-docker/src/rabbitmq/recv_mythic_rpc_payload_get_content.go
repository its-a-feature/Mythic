package rabbitmq

import (
	"encoding/json"
	"os"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCPayloadGetContentMessage struct {
	PayloadUUID string `json:"uuid"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCPayloadGetContentMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Content []byte `json:"content"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PAYLOAD_GET_PAYLOAD_CONTENT, // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_PAYLOAD_GET_PAYLOAD_CONTENT, // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCPayloadGetContent,      // points to function that takes in amqp.Delivery and returns interface{}
	})
}

//MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCPayloadGetContent(input MythicRPCPayloadGetContentMessage) MythicRPCPayloadGetContentMessageResponse {
	response := MythicRPCPayloadGetContentMessageResponse{
		Success: false,
	}
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT
	filemeta.path "filemeta.path"
	FROM payload
	JOIN filemeta ON payload.file_id = filemeta.id
	WHERE payload.uuid = $1`, input.PayloadUUID); err != nil {
		response.Error = err.Error()
		return response
	} else if diskFile, err := os.OpenFile(payload.Filemeta.Path, os.O_RDONLY, 0644); err != nil {
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
func processMythicRPCPayloadGetContent(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCPayloadGetContentMessage{}
	responseMsg := MythicRPCPayloadGetContentMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCPayloadGetContent(incomingMessage)
	}
	return responseMsg
}
