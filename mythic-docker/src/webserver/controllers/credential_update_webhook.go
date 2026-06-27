package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type UpdateCredentialInputInput struct {
	Input UpdateCredentialInput `json:"input" binding:"required"`
}

type UpdateCredentialInput struct {
	Input UpdateCredential `json:"input" binding:"required"`
}

type UpdateCredential struct {
	CredentialID       int                     `json:"credential_id" binding:"required"`
	Realm              *string                 `json:"realm"`
	Account            *string                 `json:"account"`
	Credential         *string                 `json:"credential"`
	Comment            *string                 `json:"comment"`
	CredentialType     *string                 `json:"credential_type"`
	CredentialSubtype  *string                 `json:"credential_subtype"`
	Metadata           *map[string]interface{} `json:"metadata"`
	CredentialIdentity *map[string]interface{} `json:"credential_identity"`
	CustomDisplay      *string                 `json:"custom_display"`
	Deleted            *bool                   `json:"deleted"`
}

type UpdateCredentialResponse struct {
	ID                 int                    `json:"id"`
	Status             string                 `json:"status"`
	Error              string                 `json:"error"`
	Realm              string                 `json:"realm"`
	Account            string                 `json:"account"`
	CredentialText     string                 `json:"credential_text"`
	Comment            string                 `json:"comment"`
	CredentialType     string                 `json:"credential_type"`
	CredentialSubtype  string                 `json:"credential_subtype"`
	Metadata           map[string]interface{} `json:"metadata"`
	CredentialIdentity map[string]interface{} `json:"credential_identity"`
	CustomDisplay      string                 `json:"custom_display"`
	Deleted            bool                   `json:"deleted"`
	OperatorUsername   string                 `json:"operator_username"`
}

func UpdateCredentialWebhook(c *gin.Context) {
	var input UpdateCredentialInputInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateCredentialResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		c.JSON(http.StatusOK, UpdateCredentialResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	credential := databaseStructs.Credential{}
	err = database.DB.Get(&credential, `SELECT * FROM credential WHERE id=$1 AND operation_id=$2`,
		input.Input.Input.CredentialID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get credential")
		c.JSON(http.StatusOK, UpdateCredentialResponse{
			Status: "error",
			Error:  "Failed to get credential",
		})
		return
	}

	if input.Input.Input.Realm != nil {
		credential.Realm = *input.Input.Input.Realm
	}
	if input.Input.Input.Account != nil {
		credential.Account = *input.Input.Input.Account
	}
	if input.Input.Input.Credential != nil {
		credential.Credential = *input.Input.Input.Credential
	}
	if input.Input.Input.Comment != nil {
		credential.Comment = *input.Input.Input.Comment
	}
	if input.Input.Input.CredentialType != nil {
		credential.Type = *input.Input.Input.CredentialType
	}
	if input.Input.Input.CredentialSubtype != nil {
		credential.Subtype = *input.Input.Input.CredentialSubtype
	}
	if input.Input.Input.CustomDisplay != nil {
		credential.CustomDisplay = *input.Input.Input.CustomDisplay
	}
	if input.Input.Input.Deleted != nil {
		credential.Deleted = *input.Input.Input.Deleted
	}

	metadata := credential.Metadata.StructValue()
	if input.Input.Input.Metadata != nil {
		metadata = *input.Input.Input.Metadata
	}
	identity := credential.Identity.StructValue()
	if input.Input.Input.CredentialIdentity != nil {
		identity = *input.Input.Input.CredentialIdentity
	}
	credential.Type = rabbitmq.NormalizeCredentialType(credential.Type)
	credential.Subtype = rabbitmq.NormalizeCredentialSubtype(credential.Subtype)
	parseRelevantChange := input.Input.Input.Credential != nil ||
		input.Input.Input.CredentialType != nil ||
		input.Input.Input.CredentialSubtype != nil ||
		input.Input.Input.Metadata != nil
	if parseRelevantChange {
		rabbitmq.ProcessCredentialForStorage(&credential, metadata, identity)
	} else {
		credential.Metadata = rabbitmq.GetMythicJSONTextFromStruct(metadata)
		credential.Identity = rabbitmq.GetMythicJSONTextFromStruct(identity)
	}
	if credential.Realm == "" && credential.Account == "" && len(credential.Identity.StructValue()) == 0 && !credential.Deleted {
		c.JSON(http.StatusOK, UpdateCredentialResponse{
			Status: "error",
			Error:  "Must supply an account, realm, or credential identity",
		})
		return
	}
	credential.OperatorID = operatorOperation.CurrentOperator.ID

	err = database.DB.Get(&credential, `UPDATE credential SET
		realm=$2,
		account=$3,
		credential=$4,
		comment=$5,
		metadata=$6,
		credential_identity=$7,
		custom_display=$8,
		deleted=$9,
		"type"=$10,
		subtype=$11,
		operator_id=$12
		WHERE id=$1 AND operation_id=$13
		RETURNING *`,
		credential.ID,
		credential.Realm,
		credential.Account,
		credential.Credential,
		credential.Comment,
		credential.Metadata,
		credential.Identity,
		credential.CustomDisplay,
		credential.Deleted,
		credential.Type,
		credential.Subtype,
		credential.OperatorID,
		operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to update credential")
		c.JSON(http.StatusOK, UpdateCredentialResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	go rabbitmq.RefreshCredentialValidity(credential.ID)
	c.JSON(http.StatusOK, UpdateCredentialResponse{
		ID:                 credential.ID,
		Status:             "success",
		Realm:              credential.Realm,
		Account:            credential.Account,
		CredentialText:     credential.Credential,
		Comment:            credential.Comment,
		CredentialType:     credential.Type,
		CredentialSubtype:  credential.Subtype,
		Metadata:           credential.Metadata.StructValue(),
		CredentialIdentity: credential.Identity.StructValue(),
		CustomDisplay:      credential.CustomDisplay,
		Deleted:            credential.Deleted,
		OperatorUsername:   operatorOperation.CurrentOperator.Username,
	})
}
