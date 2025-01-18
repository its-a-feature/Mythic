package webcontroller

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type EventingTriggerUpdateInput struct {
	Input EventingTriggerUpdateMessage `json:"input" binding:"required"`
}

type EventingTriggerUpdateMessage struct {
	EventGroupID  int     `json:"eventgroup_id" binding:"required"`
	Deleted       *bool   `json:"deleted,omitempty"`
	Active        *bool   `json:"active,omitempty"`
	UpdatedConfig *string `json:"updated_config,omitempty"`
}

type EventingTriggerUpdateMessageResponse struct {
	Status      string                 `json:"status"`
	Error       string                 `json:"error"`
	Active      bool                   `json:"active"`
	Deleted     bool                   `json:"deleted"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Author      string                 `json:"author"`
	Trigger     string                 `json:"trigger"`
	TriggerData map[string]interface{} `json:"trigger_data"`
	Keywords    []string               `json:"keywords"`
	Env         map[string]interface{} `json:"env"`
	RunAs       string                 `json:"run_as"`
}

func EventingTriggerUpdateWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingTriggerUpdateInput
	response := EventingTriggerUpdateMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTriggerUpdateMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
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
		c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	needToEnable := false
	needToDisable := false
	if input.Input.Active != nil {
		if eventGroup.Active && !*input.Input.Active {
			needToDisable = true
		} else if !eventGroup.Active && *input.Input.Active {
			needToEnable = true
		}
		eventGroup.Active = *input.Input.Active
	}
	if input.Input.Deleted != nil {
		if eventGroup.Deleted && !*input.Input.Deleted {
			needToEnable = true
		} else if !eventGroup.Deleted && *input.Input.Deleted {
			needToDisable = true
		}
		eventGroup.Deleted = *input.Input.Deleted
	}
	if input.Input.UpdatedConfig != nil && len(*input.Input.UpdatedConfig) > 0 {
		newEventData, err := eventing.Ingest([]byte(*input.Input.UpdatedConfig))
		if err != nil {
			logging.LogError(err, "failed to parse event group data")
			c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		eventGroup.Name = newEventData.Name
		eventGroup.Description = newEventData.Description
		eventGroup.Trigger = newEventData.Trigger
		err = eventing.EnsureTrigger(&eventGroup, false)
		if err != nil {
			logging.LogError(err, "bad trigger for updated eventing")
			c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
				Status: "error",
				Error:  fmt.Sprintf("%s is not a valid trigger", eventGroup.Trigger),
			})
			return
		}
		eventGroup.TriggerData = newEventData.TriggerData
		eventGroup.Keywords = newEventData.Keywords
		eventGroup.Environment = newEventData.Environment
		// for now don't update RunAs changes
		//eventGroup.RunAs = newEventData.RunAs
	}

	_, err = database.DB.NamedExec(`UPDATE eventgroup SET 
                      active=:active, deleted=:deleted, name=:name, description=:description,
                      trigger=:trigger, trigger_data=:trigger_data, keywords=:keywords,
                      environment=:environment, run_as=:run_as WHERE id=:id`,
		eventGroup)
	if err != nil {
		logging.LogError(err, "failed to update eventgroup")
		c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if eventGroup.Trigger == eventing.TriggerCron {
		if needToEnable {
			triggerData := eventGroup.TriggerData.StructValue()
			if _, ok = triggerData["cron"]; ok {
				cronData := triggerData["cron"].(string)
				rabbitmq.CronChannel <- rabbitmq.CronNotification{
					Action:       rabbitmq.CronActionNewEventGroup,
					EventGroupID: eventGroup.ID,
					CronSchedule: cronData,
					OperationID:  operatorOperation.CurrentOperation.ID,
					OperatorID:   eventGroup.OperatorID,
				}
			}
		}
		if needToDisable {
			rabbitmq.CronChannel <- rabbitmq.CronNotification{
				Action:       rabbitmq.CronActionTriggerRemove,
				EventGroupID: eventGroup.ID,
			}
		}

	}
	response.Status = "success"
	response.Active = eventGroup.Active
	response.Deleted = eventGroup.Deleted
	c.JSON(http.StatusOK, response)
	return

}
