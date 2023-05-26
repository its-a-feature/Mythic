package rabbitmq

import (
	"crypto/md5"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"os"

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
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCFileUpdate(input MythicRPCFileUpdateMessage) MythicRPCFileUpdateMessageResponse {
	response := MythicRPCFileUpdateMessageResponse{
		Success: false,
	}
	file := databaseStructs.Filemeta{
		AgentFileID: input.AgentFileID,
	}
	if err := database.DB.Get(&file, `SELECT id, "comment", filename, "path", delete_after_fetch
		FROM filemeta WHERE agent_file_id=$1`, input.AgentFileID); err != nil {
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
		if diskFile, err := os.OpenFile(file.Path, os.O_APPEND|os.O_RDWR, 0644); err != nil {
			response.Error = err.Error()
			return response
		} else if _, err = diskFile.Write(*input.AppendContents); err != nil {
			response.Error = err.Error()
			return response
		} else if err = diskFile.Close(); err != nil {
			response.Error = err.Error()
			return response
		} else if diskFile, err = os.OpenFile(file.Path, os.O_RDONLY, 0644); err != nil {
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
				// calculate new MD5/SHA1 hashes
				sha1Sum := sha1.Sum(fileContents)
				file.Sha1 = fmt.Sprintf("%x", sha1Sum)
				md5Sum := md5.Sum(fileContents)
				file.Md5 = fmt.Sprintf("%x", md5Sum)
				if _, err := database.DB.NamedExec(`UPDATE filemeta SET
				"comment"=:comment, filename=:filename, sha1=:sha1, md5=:md5, delete_after_fetch=:delete_after_fetch 
				WHERE id=:id`, file); err != nil {
					response.Error = err.Error()
					return response
				} else {
					response.Success = true
					go EmitFileLog(file.ID)
					return response
				}
			}

		}

	} else if input.ReplaceContents != nil {
		if diskFile, err := os.OpenFile(file.Path, os.O_TRUNC|os.O_RDWR, 0644); err != nil {
			response.Error = err.Error()
			return response
		} else if _, err = diskFile.Write(*input.ReplaceContents); err != nil {
			response.Error = err.Error()
			return response
		} else if err = diskFile.Close(); err != nil {
			response.Error = err.Error()
			return response
		} else {
			// calculate new MD5/SHA1 hashes
			sha1Sum := sha1.Sum(*input.ReplaceContents)
			file.Sha1 = fmt.Sprintf("%x", sha1Sum)
			md5Sum := md5.Sum(*input.ReplaceContents)
			file.Md5 = fmt.Sprintf("%x", md5Sum)
			if _, err := database.DB.NamedExec(`UPDATE filemeta SET
				comment=:comment, filename=:filename, sha1=:sha1, md5=:md5, delete_after_fetch=:delete_after_fetch 
				WHERE id=:id`, file); err != nil {
				response.Error = err.Error()
				return response
			} else {
				response.Success = true
				return response
			}
		}
	} else if input.Delete {
		if err := os.Remove(file.Path); err != nil {
			response.Error = err.Error()
			return response
		} else {
			if _, err := database.DB.NamedExec(`UPDATE filemeta SET
				"comment"=:comment, filename=:filename, deleted=true, delete_after_fetch=:delete_after_fetch 
				WHERE id=:id`, file); err != nil {
				response.Error = err.Error()
				return response
			} else {
				response.Success = true
				return response
			}
		}
	} else {
		if _, err := database.DB.NamedExec(`UPDATE filemeta SET
		"comment"=:comment, filename=:filename, delete_after_fetch=:delete_after_fetch 
		WHERE id=:id
		`, file); err != nil {
			response.Error = err.Error()
			return response
		}
	}
	response.Success = true
	return response
}
func processMythicRPCFileUpdate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileUpdateMessage{}
	responseMsg := MythicRPCFileUpdateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct", "body", msg.Body)
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCFileUpdate(incomingMessage)
	}
	return responseMsg
}
