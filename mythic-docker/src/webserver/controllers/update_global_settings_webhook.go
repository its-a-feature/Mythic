package webcontroller

import (
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdateGlobalSettingsInput struct {
	Input UpdateGlobalSettings `json:"input" binding:"required"`
}

type UpdateGlobalSettings struct {
	Settings map[string]interface{} `json:"settings"`
}

type UpdateGlobalSettingsResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func UpdateGlobalSettingsWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateGlobalSettingsInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateGlobalSettingsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, UpdateGlobalSettingsResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	if !operatorOperation.CurrentOperator.Admin {
		c.JSON(http.StatusOK, UpdateGlobalSettingsResponse{
			Status: "error",
			Error:  "Must be an admin to update this setting",
		})
		return
	}
	for key, value := range input.Input.Settings {
		switch key {
		case "server_config":
			mapValue, ok := value.(map[string]interface{})
			if !ok {
				logging.LogError(nil, "failed to get server config")
				continue
			}
			mapValue["version"] = utils.MythicConfig.ServerVersion
			if _, ok := mapValue["allow_invite_links"]; ok {
				utils.MythicConfig.MythicServerAllowInviteLinks = mapValue["allow_invite_links"].(bool)
			}
			if _, ok := mapValue["allow_webhooks_on_new_callbacks"]; ok {
				utils.MythicConfig.MythicServerAllowWebhooksOnNewCallbacks = mapValue["allow_webhooks_on_new_callbacks"].(bool)
			}
			if _, ok := mapValue["debug_agent_message"]; ok {
				utils.MythicConfig.DebugAgentMessage = mapValue["debug_agent_message"].(bool)
			}
			err = database.SetGlobalSetting(key, mapValue, operatorOperation.CurrentOperator.ID)
		default:
			err = database.SetGlobalSetting(key, value, operatorOperation.CurrentOperator.ID)
		}
		if err != nil {
			c.JSON(http.StatusOK, UpdateGlobalSettingsResponse{
				Status: "error",
				Error:  fmt.Sprintf("failed to set value: %v", err),
			})
			return
		}
	}
	c.JSON(http.StatusOK, UpdateGlobalSettingsResponse{
		Status: "success",
	})
	return
}
