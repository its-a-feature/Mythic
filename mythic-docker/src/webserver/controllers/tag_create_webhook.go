package webcontroller

import (
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/eventing"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type TagCreateInput struct {
	Input TagCreate `json:"input" binding:"required"`
}
type TagCreate struct {
	TagTypeID int         `json:"tagtype_id" binding:"required"`
	Data      interface{} `json:"data" binding:"required"`
	URL       string      `json:"url"`
	Source    string      `json:"source"`
	// what is this tag tagging
	MythicTreeID   *int `json:"mythictree_id"`
	FileMetaID     *int `json:"filemeta_id"`
	CredentialID   *int `json:"credential_id"`
	TaskID         *int `json:"task_id"`
	TaskArtifactID *int `json:"taskartifact_id"`
	KeylogID       *int `json:"keylog_id"`
	ResponseID     *int `json:"response_id"`
	PayloadID      *int `json:"payload_id"`
	CallbackID     *int `json:"callback_id"`
}
type TagCreateResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
	ID     int    `json:"id"`
}

// this function called from webhook_endpoint through the UI or scripting
func TagCreateWebhook(c *gin.Context) {
	var input TagCreateInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, exists := c.Get("operatorOperation")
	if !exists {
		logging.LogError(nil, "Failed to get operator operation information")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "failed to get operator information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	tagType := databaseStructs.TagType{}
	err = database.DB.Get(&tagType, `SELECT id FROM tagtype WHERE id=$1 AND operation_id=$2`,
		input.Input.TagTypeID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get tagtype information")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "failed to get tagtype in your operation",
		})
		return
	}
	databaseObj := databaseStructs.Tag{
		Operation: operatorOperation.CurrentOperation.ID,
		URL:       input.Input.URL,
		Source:    input.Input.Source,
		TagTypeID: input.Input.TagTypeID,
	}
	switch input.Input.Data.(type) {
	case string:
		databaseObj.Data = rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{
			"input": input.Input.Data,
		})
	default:
		databaseObj.Data = rabbitmq.GetMythicJSONTextFromStruct(input.Input.Data)
	}
	APITokenID, ok := c.Get("apitokens-id")
	associatedWithValidObject := false
	if ok {
		if APITokenID.(int) > 0 {
			databaseObj.APITokensID.Valid = true
			databaseObj.APITokensID.Int64 = int64(APITokenID.(int))
		}
	}
	if input.Input.MythicTreeID != nil {
		mythicTree := databaseStructs.MythicTree{}
		err = database.DB.Get(&mythicTree, `SELECT id FROM mythictree WHERE id=$1 AND operation_id=$2`,
			*input.Input.MythicTreeID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get mythictree info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.MythicTree.Valid = true
		databaseObj.MythicTree.Int64 = int64(mythicTree.ID)
		associatedWithValidObject = true
	}
	if input.Input.FileMetaID != nil {
		fileMeta := databaseStructs.Filemeta{}
		err = database.DB.Get(&fileMeta, `SELECT id FROM filemeta WHERE id=$1 AND operation_id=$2`,
			*input.Input.FileMetaID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get filemeta info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.FileMeta.Valid = true
		databaseObj.FileMeta.Int64 = int64(fileMeta.ID)
		associatedWithValidObject = true
	}
	if input.Input.TaskID != nil {
		task := databaseStructs.Task{}
		err = database.DB.Get(&task, `SELECT id FROM task WHERE id=$1 AND operation_id=$2`,
			*input.Input.TaskID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get task info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.Task.Valid = true
		databaseObj.Task.Int64 = int64(task.ID)
		associatedWithValidObject = true
	}
	if input.Input.ResponseID != nil {
		response := databaseStructs.Response{}
		err = database.DB.Get(&response, `SELECT id FROM response WHERE id=$1 AND operation_id=$2`,
			*input.Input.ResponseID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get response info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.Response.Valid = true
		databaseObj.Response.Int64 = int64(response.ID)
		associatedWithValidObject = true
	}
	if input.Input.CredentialID != nil {
		credential := databaseStructs.Credential{}
		err = database.DB.Get(&credential, `SELECT id FROM credential WHERE id=$1 AND operation_id=$2`,
			*input.Input.CredentialID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get credential info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.Credential.Valid = true
		databaseObj.Credential.Int64 = int64(credential.ID)
		associatedWithValidObject = true
	}
	if input.Input.KeylogID != nil {
		keylog := databaseStructs.Keylog{}
		err = database.DB.Get(&keylog, `SELECT id FROM keylog WHERE id=$1 AND operation_id=$2`,
			*input.Input.KeylogID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get keylog info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.Keylog.Valid = true
		databaseObj.Keylog.Int64 = int64(keylog.ID)
		associatedWithValidObject = true
	}
	if input.Input.TaskArtifactID != nil {
		artifact := databaseStructs.Taskartifact{}
		err = database.DB.Get(&artifact, `SELECT id FROM taskartifact WHERE id=$1 AND operation_id=$2`,
			*input.Input.TaskArtifactID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get artifact info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.TaskArtifact.Valid = true
		databaseObj.TaskArtifact.Int64 = int64(artifact.ID)
		associatedWithValidObject = true
	}
	if input.Input.PayloadID != nil {
		payload := databaseStructs.Payload{}
		err = database.DB.Get(&payload, `SELECT id FROM payload WHERE id=$1 AND operation_id=$2`,
			*input.Input.PayloadID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get payload info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.Payload.Valid = true
		databaseObj.Payload.Int64 = int64(payload.ID)
		associatedWithValidObject = true
	}
	if input.Input.CallbackID != nil {
		callback := databaseStructs.Callback{}
		err = database.DB.Get(&callback, `SELECT id FROM callback WHERE id=$1 AND operation_id=$2`,
			*input.Input.CallbackID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(nil, "Failed to get callback info")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "failed to get object in your operation",
			})
			return
		}
		databaseObj.Callback.Valid = true
		databaseObj.Callback.Int64 = int64(callback.ID)
		associatedWithValidObject = true
	}
	if !associatedWithValidObject {
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Failed to associate tag with any valid objects",
		})
		return
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO tag 
		(operation_id, data, url, source, tagtype_id, mythictree_id, filemeta_id, task_id, response_id, credential_id, keylog_id, taskartifact_id, payload_id, callback_id)
		VALUES 
		(:operation_id, :data, :url, :source, :tagtype_id, :mythictree_id, :filemeta_id, :task_id, :response_id, :credential_id, :keylog_id, :taskartifact_id, :payload_id, :callback_id)
		RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to prepare statement for adding tag")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = statement.Get(&databaseObj.ID, databaseObj)
	if err != nil {
		logging.LogError(err, "Failed to get new tag info")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"id":     databaseObj.ID,
	})
	go func() {
		rabbitmq.EventingChannel <- rabbitmq.EventNotification{
			Trigger:     eventing.TriggerTagCreate,
			TagID:       databaseObj.ID,
			OperationID: databaseObj.Operation,
			OperatorID:  operatorOperation.CurrentOperator.ID,
		}
	}()
}
