package webcontroller

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/pelletier/go-toml/v2"
	"gopkg.in/yaml.v3"
	"net/http"
)

type EventingExportInput struct {
	Input EventingExportMessage `json:"input" binding:"required"`
}

type EventingExportMessage struct {
	EventGroupID int    `json:"eventgroup_id" binding:"required"`
	IncludeSteps bool   `json:"include_steps"`
	OutputFormat string `json:"output_format" binding:"required"`
}

type EventingExportMessageResponse struct {
	Status   string `json:"status"`
	Error    string `json:"error"`
	Workflow string `json:"workflow"`
}

func EventingExportWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingExportInput
	response := EventingExportMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingExportMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingExportMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	eventGroup := databaseStructs.EventGroup{}
	err = database.DB.Get(&eventGroup, `SELECT *
		FROM eventgroup 
		WHERE operation_id=$1 AND id=$2`,
		operatorOperation.CurrentOperation.ID, input.Input.EventGroupID)
	if err != nil {
		logging.LogError(err, "failed to fetch eventgroup")
		c.JSON(http.StatusOK, EventingExportMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	outputString, err := getFormattedEventingFile(&eventGroup, input.Input.IncludeSteps, input.Input.OutputFormat)
	if err != nil {
		logging.LogError(nil, "failed to marshal eventgroup output")
		c.JSON(http.StatusOK, EventingExportMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	response.Status = "success"
	response.Workflow = outputString
	c.JSON(http.StatusOK, response)
	return

}
func getFormattedEventingFile(eventGroup *databaseStructs.EventGroup, includeSteps bool, outputFormat string) (string, error) {
	exportedEventGroup := eventing.EventGroup{
		Name:        eventGroup.Name,
		Description: eventGroup.Description,
		Trigger:     eventGroup.Trigger,
		TriggerData: eventGroup.TriggerData.StructValue(),
		Environment: eventGroup.Environment.StructValue(),
		Keywords:    eventGroup.Keywords.StructStringValue(),
		RunAs:       eventGroup.RunAs,
		Steps:       make([]eventing.EventStep, 0),
	}
	if includeSteps {
		for _, step := range eventGroup.Steps {
			exportedEventGroup.Steps = append(exportedEventGroup.Steps, eventing.EventStep{
				Name:            step.Name,
				Description:     step.Description,
				DependsOn:       step.DependsOn.StructStringValue(),
				Action:          step.Action,
				ActionData:      step.ActionData.StructValue(),
				Environment:     step.Environment.StructValue(),
				Inputs:          step.Inputs.StructValue(),
				Outputs:         step.Outputs.StructValue(),
				Order:           step.Order,
				ContinueOnError: step.ContinueOnError,
			})
		}
	}
	var outputBytes []byte
	var err error
	switch outputFormat {
	case "json":
		outputBytes, err = json.MarshalIndent(exportedEventGroup, "", " ")
	case "yaml":
		outputBytes, err = yaml.Marshal(exportedEventGroup)
	case "toml":
		outputBytes, err = toml.Marshal(exportedEventGroup)
	}
	if err != nil {
		logging.LogError(nil, "failed to marshal eventgroup output")
		return "", err
	}
	return string(outputBytes), nil
}
