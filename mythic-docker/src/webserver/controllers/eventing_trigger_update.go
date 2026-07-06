package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
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
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
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
	originalTrigger := eventGroup.Trigger
	originalRunAs := eventGroup.RunAs
	originalActive := eventGroup.Active
	originalDeleted := eventGroup.Deleted
	originalCronSchedule := getEventGroupCronSchedule(eventGroup)
	updateSteps := false
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
		updateSteps = len(newEventData.Steps) > 0
		if updateSteps {
			err = eventing.EnsureActions(&newEventData)
			if err != nil {
				logging.LogError(err, "bad actions for updated eventing")
				c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
		eventGroup.Name = newEventData.Name
		eventGroup.Description = newEventData.Description
		eventGroup.Trigger = newEventData.Trigger
		err = eventing.EnsureTrigger(&newEventData, updateSteps)
		if err != nil {
			logging.LogError(err, "bad trigger for updated eventing")
			c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		eventGroup.TriggerData = newEventData.TriggerData
		eventGroup.Keywords = newEventData.Keywords
		eventGroup.Environment = newEventData.Environment
		eventGroup.RunAs = newEventData.RunAs
		if updateSteps {
			err = eventing.ResolveDependencies(&newEventData)
			if err != nil {
				logging.LogError(err, "bad dependencies for updated eventing")
				c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
			eventGroup.Steps = newEventData.Steps
			eventing.SetEventGroupStepTotals(&eventGroup)
		}
	}

	_, err = database.DB.NamedExec(`UPDATE eventgroup SET 
                      active=:active, deleted=:deleted, name=:name, description=:description,
                      trigger=:trigger, trigger_data=:trigger_data, keywords=:keywords,
                      environment=:environment, run_as=:run_as, total_steps=:total_steps,
                      total_order_steps=:total_order_steps WHERE id=:id`,
		eventGroup)
	if err != nil {
		logging.LogError(err, "failed to update eventgroup")
		c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if updateSteps {
		err = eventing.SaveEventGroupSteps(&eventGroup, operatorOperation, true)
		if err != nil {
			c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		eventing.RefreshEventGroupConsumingContainers(eventGroup.ID)
	}
	if originalRunAs != eventGroup.RunAs {
		err = eventing.RefreshEventGroupApprovalEntries(&eventGroup, operatorOperation, true)
		if err != nil {
			c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
	}
	newCronSchedule := getEventGroupCronSchedule(eventGroup)
	wasRunnableCron := originalTrigger == eventing.TriggerCron && originalActive && !originalDeleted
	isRunnableCron := eventGroup.Trigger == eventing.TriggerCron && eventGroup.Active && !eventGroup.Deleted
	cronChanged := originalCronSchedule != newCronSchedule
	if wasRunnableCron && (!isRunnableCron || cronChanged || needToDisable) {
		rabbitmq.CronChannel <- rabbitmq.CronNotification{
			Action:       rabbitmq.CronActionTriggerRemove,
			EventGroupID: eventGroup.ID,
		}
	}
	if isRunnableCron && (!wasRunnableCron || cronChanged || needToEnable) {
		if newCronSchedule != "" {
			rabbitmq.CronChannel <- rabbitmq.CronNotification{
				Action:       rabbitmq.CronActionNewEventGroup,
				EventGroupID: eventGroup.ID,
				CronSchedule: newCronSchedule,
				OperationID:  operatorOperation.CurrentOperation.ID,
				OperatorID:   eventGroup.OperatorID,
			}
		}
	}
	if eventGroup.Trigger == eventing.TriggerResponseIntercept || originalTrigger == eventing.TriggerResponseIntercept {
		go rabbitmq.UpdateCachedResponseIntercept()
	}
	response.Status = "success"
	response.Active = eventGroup.Active
	response.Deleted = eventGroup.Deleted
	response.Name = eventGroup.Name
	response.Description = eventGroup.Description
	response.Trigger = eventGroup.Trigger
	response.TriggerData = eventGroup.TriggerData.StructValue()
	response.Keywords = eventGroup.Keywords.StructStringValue()
	response.Env = eventGroup.Environment.StructValue()
	response.RunAs = eventGroup.RunAs
	c.JSON(http.StatusOK, response)
	return

}

func getEventGroupCronSchedule(eventGroup databaseStructs.EventGroup) string {
	if eventGroup.Trigger != eventing.TriggerCron {
		return ""
	}
	triggerData := eventGroup.TriggerData.StructValue()
	cronValue, ok := triggerData["cron"]
	if !ok {
		return ""
	}
	cronString, ok := cronValue.(string)
	if !ok {
		return ""
	}
	return cronString
}
