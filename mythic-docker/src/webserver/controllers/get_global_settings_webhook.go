package webcontroller

import (
	"github.com/its-a-feature/Mythic/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type GetGlobalSettingResponse struct {
	Status   string                 `json:"status"`
	Error    string                 `json:"error"`
	Settings map[string]interface{} `json:"settings"`
}

func GetGlobalSettingWebhook(c *gin.Context) {
	c.JSON(http.StatusOK, GetGlobalSettingResponse{
		Status:   "success",
		Settings: utils.GetGlobalConfig(),
	})
	return
}
