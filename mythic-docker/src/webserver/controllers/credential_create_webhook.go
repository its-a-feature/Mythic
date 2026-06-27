package webcontroller

import (
	"net/http"

	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/rabbitmq"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateCredentialInput struct {
	Input CreateCredential `json:"input" binding:"required"`
}

type CreateCredential struct {
	Realm          string                 `json:"realm"`
	Account        string                 `json:"account"`
	Credential     string                 `json:"credential"`
	Comment        string                 `json:"comment"`
	CredentialType string                 `json:"credential_type"`
	Subtype        string                 `json:"credential_subtype"`
	Metadata       map[string]interface{} `json:"metadata"`
	Identity       map[string]interface{} `json:"credential_identity"`
	CustomDisplay  string                 `json:"custom_display"`
}

type CreateCredentialResponse struct {
	ID     int    `json:"id"`
	Status string `json:"status"`
	Error  string `json:"error"`
}

func CreateCredentialWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateCredentialInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateCredentialResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for create credential webhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)

	var taskIDInt *int
	if taskID, ok := input.Input.Metadata["task_id"]; ok {
		delete(input.Input.Metadata, "task_id")
		task := databaseStructs.Task{ID: int(taskID.(float64))}
		err = database.DB.Get(&task, `SELECT 
    		id 
    		FROM task 
    		WHERE id=$1 AND operation_id=$2`, taskID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to find task")
			c.JSON(http.StatusOK, CreateCredentialResponse{
				Status: "error",
				Error:  "Failed to find task",
			})
			return
		}
		taskIDInt = &task.ID
	}
	var apiTokenIDInt *int
	APITokenID, ok := c.Get(authentication.ContextKeyAPITokenID)
	if ok {
		if APITokenID.(int) > 0 {
			apiTokenID := APITokenID.(int)
			apiTokenIDInt = &apiTokenID
		}
	}
	upsertResult, err := rabbitmq.UpsertCredential(rabbitmq.CredentialUpsertInput{
		Realm:              input.Input.Realm,
		Account:            input.Input.Account,
		Credential:         input.Input.Credential,
		Comment:            input.Input.Comment,
		CredentialType:     input.Input.CredentialType,
		CredentialSubtype:  input.Input.Subtype,
		CustomDisplay:      input.Input.CustomDisplay,
		Metadata:           input.Input.Metadata,
		CredentialIdentity: input.Input.Identity,
		OperationID:        operatorOperation.CurrentOperation.ID,
		OperatorID:         operatorOperation.CurrentOperator.ID,
		TaskID:             taskIDInt,
		APITokensID:        apiTokenIDInt,
	})
	if err != nil {
		logging.LogError(err, "Failed to create credential")
		c.JSON(http.StatusOK, CreateCredentialResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, CreateCredentialResponse{
		Status: "success",
		ID:     upsertResult.Credential.ID,
	})
	return
}
