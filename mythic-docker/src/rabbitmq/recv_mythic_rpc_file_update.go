package rabbitmq

import (
	"crypto/md5"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"os"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileUpdateMessage struct {
	AgentFileID      string  `json:"file_id"`
	Comment          string  `json:"comment"`
	Filename         string  `json:"filename"`
	DeleteAfterFetch *bool   `json:"delete_after_fetch,omitempty"`
	AppendContents   *[]byte `json:"append_contents"`
	ReplaceContents  *[]byte `json:"replace_contents"`
	Delete           bool    `json:"delete"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCFileUpdateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILE_UPDATE,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_FILE_UPDATE,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCFileUpdate, // points to function that takes in amqp.Delivery and returns interface{}
		Scopes:     []string{mythicjwt.SCOPE_FILE_WRITE},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCFileUpdate(input MythicRPCFileUpdateMessage, authContext RabbitMQAuthContext) MythicRPCFileUpdateMessageResponse {
	response := MythicRPCFileUpdateMessageResponse{
		Success: false,
	}
	file := databaseStructs.Filemeta{
		AgentFileID: input.AgentFileID,
	}
	err := database.DB.Get(&file, `
		SELECT id, "comment", filename, "path", delete_after_fetch
		FROM filemeta 
		WHERE agent_file_id=$1 AND operation_id=$2`, input.AgentFileID, authContext.OperationID)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	if len(input.Filename) != 0 {
		file.Filename = []byte(input.Filename)
	}
	if input.Comment != "" {
		file.Comment = input.Comment
	}
	if input.DeleteAfterFetch != nil {
		file.DeleteAfterFetch = *input.DeleteAfterFetch
	}
	if input.AppendContents != nil {
		diskFile, err := os.OpenFile(file.Path, os.O_APPEND|os.O_RDWR, 0644)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		_, err = diskFile.Write(*input.AppendContents)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		err = diskFile.Close()
		if err != nil {
			response.Error = err.Error()
			return response
		}
		diskFile, err = os.OpenFile(file.Path, os.O_RDONLY, 0644)
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
		// calculate new MD5/SHA1 hashes
		sha1Sum := sha1.Sum(fileContents)
		file.Sha1 = fmt.Sprintf("%x", sha1Sum)
		md5Sum := md5.Sum(fileContents)
		file.Md5 = fmt.Sprintf("%x", md5Sum)
		_, err = database.DB.NamedExec(`UPDATE filemeta SET
				"comment"=:comment, filename=:filename, sha1=:sha1, md5=:md5, delete_after_fetch=:delete_after_fetch 
				WHERE id=:id`, file)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		response.Success = true
		go EmitFileLog(file.ID)
		return response
	}
	if input.ReplaceContents != nil {
		diskFile, err := os.OpenFile(file.Path, os.O_TRUNC|os.O_RDWR, 0644)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		_, err = diskFile.Write(*input.ReplaceContents)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		err = diskFile.Close()
		if err != nil {
			response.Error = err.Error()
			return response
		}
		// calculate new MD5/SHA1 hashes
		sha1Sum := sha1.Sum(*input.ReplaceContents)
		file.Sha1 = fmt.Sprintf("%x", sha1Sum)
		md5Sum := md5.Sum(*input.ReplaceContents)
		file.Md5 = fmt.Sprintf("%x", md5Sum)
		_, err = database.DB.NamedExec(`UPDATE filemeta SET
				comment=:comment, filename=:filename, sha1=:sha1, md5=:md5, delete_after_fetch=:delete_after_fetch 
				WHERE id=:id`, file)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		response.Success = true
		return response
	}
	if input.Delete {
		err = os.Remove(file.Path)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		_, err = database.DB.NamedExec(`UPDATE filemeta SET
				"comment"=:comment, filename=:filename, deleted=true, delete_after_fetch=:delete_after_fetch 
				WHERE id=:id`, file)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		response.Success = true
		return response
	}
	_, err = database.DB.NamedExec(`UPDATE filemeta SET
		"comment"=:comment, filename=:filename, delete_after_fetch=:delete_after_fetch 
		WHERE id=:id
		`, file)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}
func processMythicRPCFileUpdate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileUpdateMessage{}
	responseMsg := MythicRPCFileUpdateMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct", "body", msg.Body)
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCFileUpdate(incomingMessage, authContext)
}
