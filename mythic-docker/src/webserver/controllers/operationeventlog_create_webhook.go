package webcontroller

import (
	"github.com/gin-gonic/gin"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type CreateOperationEventLogInput struct {
	Input CreateOperationEventLogData `json:"input" binding:"required"`
}

type CreateOperationEventLogData struct {
	Level   string `json:"level"`
	Message string `json:"message" binding:"required"`
	Source  string `json:"source"`
}

type CreateOperationEventLogDataResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func CreateOperationEventLog(c *gin.Context) {
	// get variables from the POST request
	var input CreateOperationEventLogInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateOperationEventLogDataResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, CreateOperationEventLogDataResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	level := "info"
	if input.Input.Level == "warning" {
		level = "warning"
	}
	source := input.Input.Source
	if input.Input.Source == "" {
		source = mythicCrypto.HashMD5([]byte(input.Input.Message))
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	go rabbitmq.SendAllOperationsMessage(input.Input.Message, operatorOperation.CurrentOperation.ID,
		source, level)
	c.JSON(http.StatusOK, SendExternalWebhookResponse{
		Status: "success",
	})
	return
}
