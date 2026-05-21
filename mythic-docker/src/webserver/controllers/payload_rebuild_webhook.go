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

type PayloadRebuildInput struct {
	Input PayloadRebuild `json:"input" binding:"required"`
}

type PayloadRebuild struct {
	PayloadUUID string `json:"uuid" binding:"required"`
}

type PayloadRebuildResponse struct {
	Status      string `json:"status"`
	PayloadUUID string `json:"uuid"`
	Error       string `json:"error"`
}

func PayloadRebuildWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ExportPayloadConfigInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, PayloadRebuildResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		c.JSON(http.StatusOK, PayloadRebuildResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	// get the associated database information
	payloadConfiguration := rabbitmq.PayloadConfiguration{}
	payload := databaseStructs.Payload{}
	err = database.DB.Get(&payload, `SELECT
		payload.id, payload.description, payload.uuid, payload.os, payload.wrapped_payload_id, 
		payloadtype.name "payloadtype.name",
		filemeta.filename "filemeta.filename"
		FROM
		payload
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
		JOIN filemeta ON payload.file_id = filemeta.id
		WHERE 
		payload.uuid=$1 and payload.operation_id=$2`, input.Input.PayloadUUID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get payload")
		c.JSON(http.StatusOK, PayloadRebuildResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	payloadConfiguration.Description = payload.Description
	payloadConfiguration.SelectedOS = payload.Os
	payloadConfiguration.PayloadType = payload.Payloadtype.Name
	payloadConfiguration.C2Profiles = rabbitmq.GetPayloadC2ProfileInformation(payload)
	payloadConfiguration.BuildParameters = rabbitmq.GetBuildParameterInformation(payload.ID)
	payloadConfiguration.Commands = rabbitmq.GetPayloadCommandInformation(payload)
	payloadConfiguration.Filename = string(payload.Filemeta.Filename)
	if payload.WrappedPayloadID.Valid {
		// get the associated UUID for the wrapped payload
		wrappedPayload := databaseStructs.Payload{}
		if err := database.DB.Get(&wrappedPayload, `SELECT uuid FROM payload WHERE id=$1`, payload.WrappedPayloadID.Int64); err != nil {
			logging.LogError(err, "Failed to fetch wrapped payload information")
		} else {
			payloadConfiguration.WrappedPayloadUUID = wrappedPayload.UuID
		}
	}
	newUUID, _, err := rabbitmq.RegisterNewPayload(payloadConfiguration, operatorOperation, authentication.RabbitMQAuthContextFromGin(c))
	if err != nil {
		logging.LogError(err, "Failed to trigger rebuild of payload")
		c.JSON(http.StatusOK, PayloadRebuildResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, PayloadRebuildResponse{
		Status:      "success",
		PayloadUUID: newUUID,
	})
	return
}
