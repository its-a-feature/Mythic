package webcontroller

import (
	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type generateReportInput struct {
	Input generateReport `json:"input" binding:"required"`
}

type generateReport struct {
	IncludeMITREPerTask bool   `json:"includeMITREPerTask" `
	IncludeMITREOverall bool   `json:"includeMITREOverall" `
	ExcludedUsers       string `json:"excludedUsers"`
	ExcludedHosts       string `json:"excludedHosts" `
	ExcludedIDs         string `json:"excludedIDs" `
	IncludeOutput       bool   `json:"includeOutput" `
	OutputFormat        string `json:"outputFormat" `
}

func ReportingWebhook(c *gin.Context) {
	// get variables from the POST request
	var input generateReportInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, rabbitmq.CreateTaskResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get information about the user and operation that's being tasked
	if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Failed to get current operation. Is it set?",
		})
		return
	} else {

		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		config := rabbitmq.GenerateReportMessage{
			IncludeOutput:       input.Input.IncludeOutput,
			IncludeMITREPerTask: input.Input.IncludeMITREPerTask,
			IncludeMITREOverall: input.Input.IncludeMITREOverall,
			ExcludedHosts:       input.Input.ExcludedHosts,
			ExcludedUsers:       input.Input.ExcludedUsers,
			ExcludedIDs:         input.Input.ExcludedIDs,
			OutputFormat:        input.Input.OutputFormat,
			OperatorOperation:   operatorOperation,
		}
		go rabbitmq.GenerateReport(config)
		c.JSON(http.StatusOK, gin.H{"status": "success"})
		return
	}
}
