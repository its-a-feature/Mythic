package webcontroller

import (
	"net/http"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"

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
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT 
    	id FROM payload 
    	   WHERE uuid=$1 AND operation_id=$2`, input.Input.PayloadUUID, user.CurrentOperationID.Int64); err != nil {
		logging.LogError(err, "Failed to find payload when doing a CreateCallbackWebhook")
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
