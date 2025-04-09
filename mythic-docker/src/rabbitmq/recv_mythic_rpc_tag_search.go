package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTagSearchMessage struct {
	TaskID                int     `json:"task_id"`
	SearchTagID           *int    `json:"search_tag_id"`
	SearchTagTaskID       *int    `json:"search_tag_task_id"`
	SearchTagFileID       *int    `json:"search_tag_file_id,omitempty"`
	SearchTagCredentialID *int    `json:"search_tag_credential_id,omitempty"`
	SearchTagMythicTreeID *int    `json:"search_tag_mythictree_id,omitempty"`
	SearchTagSource       *string `json:"search_tag_source,omitempty"`
	SearchTagData         *string `json:"search_tag_data,omitempty"`
	SearchTagURL          *string `json:"search_tag_url,omitempty"`
}

type MythicRPCTagTypeData struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	OperationID int    `json:"operation_id"`
}
type MythicRPCTagData struct {
	ID           int                    `json:"id"`
	TagTypeID    int                    `json:"tagtype_id"`
	TagType      MythicRPCTagTypeData   `json:"tagtype"`
	Data         map[string]interface{} `json:"data"`
	URL          string                 `json:"url"`
	Source       string                 `json:"source"`
	TaskID       *int                   `json:"task_id"`
	FileID       *int                   `json:"file_id"`
	CredentialID *int                   `json:"credential_id"`
	MythicTreeID *int                   `json:"mythic_tree_id"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTagSearchMessageResponse struct {
	Success bool               `json:"success"`
	Error   string             `json:"error"`
	Tags    []MythicRPCTagData `json:"tags"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TAG_SEARCH,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TAG_SEARCH,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTagSearch, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTagSearch(input MythicRPCTagSearchMessage) MythicRPCTagSearchMessageResponse {
	response := MythicRPCTagSearchMessageResponse{
		Success: false,
	}
	operationID := 0
	err := database.DB.Get(&operationID, `SELECT task.operation_id FROM task WHERE id=$1`, input.TaskID)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	paramDict := make(map[string]interface{})
	setAnySearchValues := false
	searchString := `SELECT 
    	tag.id, tag.data, tag.url, tag.source, tag.eventstepinstance_id, tag.operation_id,
    	tagtype.id "tagtype.name",
    	tagtype.name "tagtype.name",
    	tagtype.description "tagtype.description",
    	tagtype.color "tagtype.color",
		tagtype.operation_id "tagtype.operation_id"
		FROM tag 
	    JOIN tagtype ON tag.tagtype_id = tagtype.id `
	if input.SearchTagID != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.id=:id `
		} else {
			searchString += `AND tag.id=:id `
		}
		paramDict["id"] = *input.SearchTagID
		setAnySearchValues = true
	}
	if input.SearchTagTaskID != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.task_id=:task_id `
		} else {
			searchString += `AND tag.task_id=:task_id `
		}
		paramDict["task_id"] = *input.SearchTagTaskID
		setAnySearchValues = true
	}
	if input.SearchTagFileID != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.filemeta_id=:filemeta_id `
		} else {
			searchString += `AND tag.filemeta_id=:filemeta_id `
		}
		paramDict["filemeta_id"] = *input.SearchTagFileID
		setAnySearchValues = true
	}
	if input.SearchTagCredentialID != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.credential_id=:credential_id `
		} else {
			searchString += `AND tag.credential_id=:credential_id `
		}
		paramDict["credential_id"] = *input.SearchTagCredentialID
		setAnySearchValues = true
	}
	if input.SearchTagMythicTreeID != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.mythictree_id=:mythictree_id `
		} else {
			searchString += `AND tag.mythictree_id=:mythictree_id `
		}
		paramDict["mythictree_id"] = *input.SearchTagMythicTreeID
		setAnySearchValues = true
	}
	if input.SearchTagSource != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.source ILIKE :source `
		} else {
			searchString += `AND tag.source ILIKE :source `
		}
		paramDict["source"] = "%" + *input.SearchTagSource + "%"
		setAnySearchValues = true
	}
	if input.SearchTagURL != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.url ILIKE :url `
		} else {
			searchString += `AND tag.url ILIKE :url `
		}
		paramDict["url"] = *input.SearchTagURL
		setAnySearchValues = true
	}
	if input.SearchTagData != nil {
		if !setAnySearchValues {
			searchString += `WHERE tag.data ILIKE :data `
		} else {
			searchString += `AND tag.data ILIKE :data `
		}
		paramDict["data"] = *input.SearchTagData
		setAnySearchValues = true
	}
	if !setAnySearchValues {
		searchString += `WHERE tag.operation_id=:operation_id `
		paramDict["operation_id"] = operationID
	} else {
		searchString += `AND tag.operation_id=:operation_id `
		paramDict["operation_id"] = operationID
	}
	searchString += " ORDER BY tag.id DESC"
	query, args, err := sqlx.Named(searchString, paramDict)
	if err != nil {
		logging.LogError(err, "Failed to make named statement when searching for tasks")
		response.Error = err.Error()
		return response
	}
	query, args, err = sqlx.In(query, args...)
	if err != nil {
		logging.LogError(err, "Failed to do sqlx.In")
		response.Error = err.Error()
		return response
	}
	query = database.DB.Rebind(query)
	tags := []databaseStructs.Tag{}
	err = database.DB.Select(&tags, query, args...)
	if err != nil {
		logging.LogError(err, "Failed to exec sqlx.IN modified statement")
		response.Error = err.Error()
		return response
	}
	for _, tag := range tags {
		response.Tags = append(response.Tags, getTagDataFromDatabaseTag(tag))
	}
	response.Success = true
	return response
}
func getTagDataFromDatabaseTag(t databaseStructs.Tag) MythicRPCTagData {
	tag := MythicRPCTagData{
		ID:        t.ID,
		TagTypeID: t.TagTypeID,
		Data:      t.Data.StructValue(),
		URL:       t.URL,
		Source:    t.Source,
		TagType:   getTagTypeDataFromDatabaseTagType(t.TagType),
	}
	if t.Task.Valid {
		taskID := int(t.Task.Int64)
		tag.TaskID = &taskID
	}
	if t.FileMeta.Valid {
		fileID := int(t.FileMeta.Int64)
		tag.FileID = &fileID
	}
	if t.Credential.Valid {
		credentialID := int(t.Credential.Int64)
		tag.CredentialID = &credentialID
	}
	if t.MythicTree.Valid {
		mythictreeID := int(t.MythicTree.Int64)
		tag.MythicTreeID = &mythictreeID
	}
	return tag
}
func processMythicRPCTagSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTagSearchMessage{}
	responseMsg := MythicRPCTagSearchMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCTagSearch(incomingMessage)
}
