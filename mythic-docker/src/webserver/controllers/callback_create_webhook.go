package webcontroller

import (
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
)

// Structs defining the input we get from the user to process
type callbackCreateInput struct {
	Input callbackCreate `json:"input" binding:"required"`
}
type callbackCreate struct {
	PayloadUUID    string               `json:"payloadUuid" binding:"required"`
	CallbackConfig createCallbackConfig `json:"newCallback"`
}
type createCallbackConfig struct {
	IP          string `json:"ip"`
	ExternalIp  string `json:"externalIp"`
	User        string `json:"user"`
	Host        string `json:"host"`
	Domain      string `json:"domain"`
	Description string `json:"description"`
	ProcessName string `json:"processName"`
	SleepInfo   string `json:"sleepInfo"`
	ExtraInfo   string `json:"extraInfo"`
}

// this function called from webhook_endpoint through the UI or scripting
func CreateCallbackWebhook(c *gin.Context) {
	var input callbackCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for CreateCallbackWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	callbackCreateResponse := rabbitmq.MythicRPCCallbackCreate(rabbitmq.MythicRPCCallbackCreateMessage{
		PayloadUUID: input.Input.PayloadUUID,
		User:        input.Input.CallbackConfig.User,
		Host:        input.Input.CallbackConfig.Host,
		ExtraInfo:   input.Input.CallbackConfig.ExtraInfo,
		SleepInfo:   input.Input.CallbackConfig.SleepInfo,
		Ip:          input.Input.CallbackConfig.IP,
		ExternalIP:  input.Input.CallbackConfig.ExternalIp,
		Domain:      input.Input.CallbackConfig.Domain,
		Description: input.Input.CallbackConfig.Description,
		ProcessName: input.Input.CallbackConfig.ProcessName,
	})
	if !callbackCreateResponse.Success {
		logging.LogError(nil, callbackCreateResponse.Error)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": callbackCreateResponse.Error})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
