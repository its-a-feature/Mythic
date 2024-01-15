package webcontroller

import (
	"fmt"
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
		err = utils.SetConfigValue(key, value)
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
