package webcontroller

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ExportCallbackConfigInput struct {
	Input ExportCallbackConfig `json:"input" binding:"required"`
}

type ExportCallbackConfig struct {
	AgentCallbackID string `json:"agent_callback_id" binding:"required"`
}

type ExportCallbackConfigResponse struct {
	Status          string `json:"status"`
	Config          string `json:"config"`
	Error           string `json:"error"`
	AgentCallbackID string `json:"agent_callback_id"`
}
type ExportCallbackConfigurationPayloadType struct {
	Name                     string `json:"name"`
	MythicEncrypts           bool   `json:"mythic_encrypts"`
	TranslationContainerName string `json:"translation_container"`
}
type ExportCallbackConfiguration struct {
	Callback         databaseStructs.Callback                      `json:"callback"`
	CallbackC2       []rabbitmq.PayloadConfigurationC2Profile      `json:"callback_c2"`
	CallbackCommands []string                                      `json:"callback_commands"`
	Payload          databaseStructs.Payload                       `json:"payload"`
	PayloadType      ExportCallbackConfigurationPayloadType        `json:"payload_type"`
	PayloadC2        []rabbitmq.PayloadConfigurationC2Profile      `json:"payload_c2"`
	PayloadBuild     []rabbitmq.PayloadConfigurationBuildParameter `json:"payload_build"`
	PayloadCommands  []string                                      `json:"payload_commands"`
	PayloadFilename  string                                        `json:"payload_filename"`
}

func ExportCallbackConfigWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ExportCallbackConfigInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, ExportCallbackConfigResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get operatorOperation from gin context from middleware")
		c.JSON(http.StatusOK, ExportCallbackConfigResponse{
			Status: "error",
			Error:  "Failed to get current operation information",
		})
		return
	}
	// get the associated database information
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	callback := databaseStructs.Callback{}
	payload := databaseStructs.Payload{}
	err = database.DB.Get(&callback, `SELECT * FROM callback WHERE agent_callback_id=$1`, input.Input.AgentCallbackID)
	if err != nil {
		logging.LogError(err, "Failed to get callback from database")
		c.JSON(http.StatusOK, ExportCallbackConfigResponse{
			Status: "error",
			Error:  fmt.Sprintf("Failed to get callback information: %v", err),
		})
		return
	}
	err = database.DB.Get(&payload, `SELECT
	payload.*, 
	payloadtype.name "payloadtype.name",
	payloadtype.mythic_encrypts "payloadtype.mythic_encrypts",
	payloadtype.translation_container_id "payloadtype.translation_container_id",
	filemeta.filename "filemeta.filename" 
	FROM
	payload
	JOIN payloadtype ON payload.payload_type_id = payloadtype.id
	JOIN filemeta ON payload.file_id = filemeta.id
	WHERE 
	payload.id=$1 and payload.operation_id=$2`, callback.RegisteredPayloadID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get payload when exporting callback")
		c.JSON(http.StatusOK, ExportCallbackConfigResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	translationContainer := databaseStructs.Translationcontainer{}
	if payload.Payloadtype.TranslationContainerID.Valid {
		err = database.DB.Get(&translationContainer, `SELECT "name" FROM translationcontainer WHERE id=$1`,
			payload.Payloadtype.TranslationContainerID)
		if err != nil {
			logging.LogError(err, "Failed to get translation container when exporting callback")
			c.JSON(http.StatusOK, ExportCallbackConfigResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
	}
	config := ExportCallbackConfiguration{}
	config.Callback = callback
	config.CallbackC2 = *rabbitmq.GetCallbackC2ProfileInformation(callback)
	config.CallbackCommands = rabbitmq.GetCallbackCommandInformation(callback)
	config.Payload = payload
	config.PayloadType = ExportCallbackConfigurationPayloadType{
		Name:                     payload.Payloadtype.Name,
		MythicEncrypts:           payload.Payloadtype.MythicEncrypts,
		TranslationContainerName: translationContainer.Name,
	}
	config.PayloadC2 = *rabbitmq.GetPayloadC2ProfileInformation(payload)
	config.PayloadBuild = *rabbitmq.GetBuildParameterInformation(payload.ID)
	config.PayloadCommands = rabbitmq.GetPayloadCommandInformation(payload)
	config.PayloadFilename = string(payload.Filemeta.Filename)

	payloadConfigurationString, err := json.MarshalIndent(config, "", "\t")
	if err != nil {
		logging.LogError(err, "Failed to convert config to bytes")
		c.JSON(http.StatusOK, ExportCallbackConfigResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, ExportCallbackConfigResponse{
		Status:          "success",
		AgentCallbackID: input.Input.AgentCallbackID,
		Config:          string(payloadConfigurationString),
	})
	return

}
