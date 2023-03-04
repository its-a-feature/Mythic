package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileRegisterMessage struct {
	Filename         []byte `json:"filename"`
	Comment          string `json:"comment"`
	OperationID      int    `json:"operation_id"`
	OperatorID       int    `json:"operator_id"`
	DeleteAfterFetch bool   `json:"delete_after_fetch"`
}
type MythicRPCFileRegisterMessageResponse struct {
	Success     bool   `json:"success"`
	Error       string `json:"error"`
	AgentFileId string `json:"agent_file_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILE_REGISTER,
		RoutingKey: MYTHIC_RPC_FILE_REGISTER,
		Handler:    processMythicRPCFileCreate,
	})
}

// Endpoint: MYTHIC_RPC_FILE_REGISTER
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCPFileRegister(input MythicRPCFileRegisterMessage) MythicRPCFileRegisterMessageResponse {
	response := MythicRPCFileRegisterMessageResponse{
		Success: false,
	}
	var err error
	fileData := databaseStructs.Filemeta{
		AgentFileID:         uuid.New().String(),
		TotalChunks:         1,
		ChunksReceived:      1,
		Complete:            true,
		Comment:             input.Comment,
		DeleteAfterFetch:    input.DeleteAfterFetch,
		IsScreenshot:        false,
		IsDownloadFromAgent: false,
		IsPayload:           false,
	}
	fileData.Filename = []byte(uuid.New().String())
	fileData.AgentFileID, fileData.Path, err = GetSaveFilePath()
	if err != nil {
		response.Error = err.Error()
		return response
	}
	if len(input.Filename) != 0 {
		fileData.Filename = input.Filename
	}

	if input.Comment == "" {
		fileData.Comment = fmt.Sprintf("Created from payload build process")
	}

	fileData.OperationID = input.OperationID
	fileData.OperatorID = input.OperatorID

	if statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,"path",operation_id,complete,"comment",operator_id,agent_file_id)
			VALUES (:filename, :total_chunks, :chunks_received, :path, :operation_id, :complete, :comment, :operator_id, :agent_file_id)
			RETURNING id`); err != nil {
		logging.LogError(err, "Failed to save file metadata to database")
		response.Error = err.Error()
		return response
	} else if err = statement.Get(&fileData.ID, fileData); err != nil {
		logging.LogError(err, "Failed to save file to the database")
		response.Error = err.Error()
		return response
	} else {
		logging.LogDebug("creating new file", "filedata", fileData)
		response.Success = true
		response.AgentFileId = fileData.AgentFileID
		go EmitFileLog(fileData.ID)
		return response
	}

}
func processMythicRPCPayloadRegisterFile(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileRegisterMessage{}
	responseMsg := MythicRPCFileRegisterMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCPFileRegister(incomingMessage)
	}
	return responseMsg
}
