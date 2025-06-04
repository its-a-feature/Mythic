package webcontroller

import (
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type UpdatePayloadInput struct {
	Input UpdatePayload `json:"input" binding:"required"`
}

type UpdatePayload struct {
	PayloadUUID     string  `json:"payload_uuid" binding:"required"`
	CallbackAlert   *bool   `json:"callback_alert"`
	CallbackAllowed *bool   `json:"callback_allowed"`
	Deleted         *bool   `json:"deleted"`
	Description     *string `json:"description,omitempty"`
}

type UpdatePayloadResponse struct {
	Status          string `json:"status"`
	Error           string `json:"error"`
	CallbackAlert   bool   `json:"callback_alert"`
	CallbackAllowed bool   `json:"callback_allowed"`
	Description     string `json:"description"`
	Deleted         bool   `json:"deleted"`
	Id              int    `json:"id"`
	PayloadUUID     string `json:"payload_uuid"`
}

func UpdatePayloadWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdatePayloadInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdatePayloadResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, UpdatePayloadResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	payload := databaseStructs.Payload{}
	err := database.DB.Get(&payload, `SELECT 
			*
			FROM payload
			WHERE uuid=$1 and operation_id=$2`, input.Input.PayloadUUID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get payload")
		c.JSON(http.StatusOK, UpdatePayloadResponse{
			Status: "error",
			Error:  "Failed to get Payload",
		})
		return
	}
	if input.Input.Description != nil {
		payload.Description = *input.Input.Description
	}
	if input.Input.CallbackAlert != nil {
		payload.CallbackAlert = *input.Input.CallbackAlert
	}
	if input.Input.CallbackAllowed != nil {
		payload.CallbackAllowed = *input.Input.CallbackAllowed
		rabbitmq.UpdatePayloadInfoCallbackAllowed(payload.ID, *input.Input.CallbackAllowed)
	}
	if input.Input.Deleted != nil {
		payload.Deleted = *input.Input.Deleted
		if *input.Input.Deleted {
			DeleteFilesHelper([]int{int(payload.FileID.Int64)}, operatorOperation)
		}
	}
	_, err = database.DB.NamedExec(`UPDATE payload SET 
				description=:description, callback_alert=:callback_alert, callback_allowed=:callback_allowed, deleted=:deleted
				WHERE id=:id`, payload)
	if err != nil {
		logging.LogError(err, "failed to update payload information")
		c.JSON(http.StatusOK, UpdatePayloadResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, UpdatePayloadResponse{
		Status:          "success",
		Id:              payload.ID,
		PayloadUUID:     payload.UuID,
		CallbackAlert:   payload.CallbackAlert,
		CallbackAllowed: payload.CallbackAllowed,
		Deleted:         payload.Deleted,
		Description:     payload.Description,
	})
	return
}
