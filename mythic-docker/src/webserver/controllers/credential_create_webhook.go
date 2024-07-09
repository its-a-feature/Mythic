package webcontroller

import (
	"database/sql"
	"errors"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateCredentialInput struct {
	Input CreateCredential `json:"input" binding:"required"`
}

type CreateCredential struct {
	Realm          string `json:"realm"`
	Account        string `json:"account"`
	Credential     string `json:"credential" binding:"required"`
	Comment        string `json:"comment"`
	CredentialType string `json:"credential_type"`
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
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreatePayloadWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)

	databaseCred := databaseStructs.Credential{
		Realm:       input.Input.Realm,
		Account:     input.Input.Account,
		OperationID: operatorOperation.CurrentOperation.ID,
		Credential:  input.Input.Credential,
		Deleted:     false,
		Comment:     input.Input.Comment,
		OperatorID:  operatorOperation.CurrentOperator.ID,
	}
	if utils.SliceContains(rabbitmq.ValidCredentialTypesList, input.Input.CredentialType) {
		databaseCred.Type = input.Input.CredentialType
	} else {
		databaseCred.Type = "plaintext"
	}
	APITokenID, ok := c.Get("apitokens-id")
	if ok {
		if APITokenID.(int) > 0 {
			databaseCred.APITokensID.Valid = true
			databaseCred.APITokensID.Int64 = int64(APITokenID.(int))
		}
	}
	// check if the cred already exists. If it does, move on. If it doesn't, create it
	err = database.DB.Get(&databaseCred, `SELECT * FROM credential WHERE
			 account=$1 AND realm=$2 AND credential=$3 AND operation_id=$4`,
		databaseCred.Account, databaseCred.Realm, databaseCred.Credential, databaseCred.OperationID)
	if errors.Is(err, sql.ErrNoRows) {
		// credential doesn't exist, so create it
		statement, err := database.DB.PrepareNamed(`INSERT INTO credential
				(realm, account, operation_id, credential, deleted, comment, metadata, task_id, "type", operator_id, apitokens_id)
				VALUES (:realm, :account, :operation_id, :credential, :deleted, :comment, :metadata, :task_id, :type, :operator_id, :apitokens_id)
				RETURNING id `)
		if err != nil {
			logging.LogError(err, "Failed to create new credential")
			c.JSON(http.StatusOK, CreateCredentialResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		err = statement.Get(&databaseCred.ID, databaseCred)
		if err != nil {
			logging.LogError(err, "Failed to create new credential")
			c.JSON(http.StatusOK, CreateCredentialResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		go rabbitmq.EmitCredentialLog(databaseCred.ID)
		c.JSON(http.StatusOK, CreateCredentialResponse{
			Status: "success",
			ID:     databaseCred.ID,
		})
		return
	}
	if err != nil {
		// ran into an issue doing the query
		logging.LogError(err, "Failed to query for credential")
		c.JSON(http.StatusOK, CreateCredentialResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if databaseCred.Deleted {
		// the credential exists, make sure it's marked as not deleted
		if _, err := database.DB.Exec(`UPDATE credential SET deleted=false WHERE id=$1`, databaseCred.ID); err != nil {
			logging.LogError(err, "failed to update credential that already exists")
		}
		c.JSON(http.StatusOK, CreateCredentialResponse{
			Status: "success",
			ID:     databaseCred.ID,
		})
		return
	}
}
