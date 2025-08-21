package webcontroller

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"net/http"

	"github.com/gin-gonic/gin"
)

type GetGlobalSettingResponse struct {
	Status   string                 `json:"status"`
	Error    string                 `json:"error"`
	Settings map[string]interface{} `json:"settings"`
}

func GetGlobalSettingWebhook(c *gin.Context) {
	globalSettings := []databaseStructs.GlobalSetting{}
	err := database.DB.Select(&globalSettings, `SELECT 
    	global_setting.name, global_setting.setting, global_setting.operator_id
		FROM global_setting`)
	if err != nil {
		logging.LogError(err, "Failed to get global settings")
		c.JSON(http.StatusOK, GetGlobalSettingResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	resp := GetGlobalSettingResponse{
		Status:   "success",
		Settings: map[string]interface{}{},
	}
	for _, globalSetting := range globalSettings {
		resp.Settings[globalSetting.Name] = globalSetting.Setting
	}
	c.JSON(http.StatusOK, resp)
	return
}
