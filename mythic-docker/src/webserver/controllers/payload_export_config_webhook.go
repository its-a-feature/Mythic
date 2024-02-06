package webcontroller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ExportPayloadConfigInput struct {
	Input ExportPayloadConfig `json:"input" binding:"required"`
}

type ExportPayloadConfig struct {
	PayloadUUID string `json:"uuid" binding:"required"`
}

type ExportPayloadConfigResponse struct {
	Status string `json:"status"`
	Config string `json:"config"`
	Error  string `json:"error"`
}

func ExportPayloadConfigWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ExportPayloadConfigInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusOK, ExportPayloadConfigResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(nil, "Failed to get operatorOperation from gin context from middleware")
		c.JSON(http.StatusOK, ExportPayloadConfigResponse{
			Status: "error",
			Error:  "Failed to get current operation information",
		})
		return
	} else {
		// get the associated database information
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		payloadConfiguration := rabbitmq.PayloadConfiguration{}
		payload := databaseStructs.Payload{}
		if err := database.DB.Get(&payload, `SELECT
	payload.id, payload.description, payload.uuid, payload.os, payload.wrapped_payload_id, 
	payloadtype.name "payloadtype.name",
	filemeta.filename "filemeta.filename" 
	FROM
	payload
	JOIN payloadtype ON payload.payload_type_id = payloadtype.id
	JOIN filemeta ON payload.file_id = filemeta.id
	WHERE 
	payload.uuid=$1 and payload.operation_id=$2`, input.Input.PayloadUUID, operatorOperation.CurrentOperation.ID); err != nil {
			logging.LogError(err, "Failed to get payload")
			c.JSON(http.StatusOK, ExportPayloadConfigResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else {
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
			if payloadConfigurationString, err := json.MarshalIndent(payloadConfiguration, "", "\t"); err != nil {
				logging.LogError(err, "Failed to convert payloadConfiguration to bytes")
				c.JSON(http.StatusOK, ExportPayloadConfigResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			} else {
				c.JSON(http.StatusOK, ExportPayloadConfigResponse{
					Status: "success",
					Config: string(payloadConfigurationString),
				})
				return
			}

		}
	}

}
