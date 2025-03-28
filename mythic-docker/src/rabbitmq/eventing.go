package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-co-op/gocron/v2"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/mitchellh/mapstructure"
	"golang.org/x/exp/slices"
	"strings"
	"time"
)

type EventNotification struct {
	// required always
	Trigger     string `json:"trigger"`
	OperationID int    `json:"operation_id"`
	OperatorID  int    `json:"operator_id"`

	// optional
	Keyword        string                 `json:"keyword"`
	KeywordEnvData map[string]interface{} `json:"keyword_env_data"`
	// manual trigger
	EventGroupID int `json:"eventgroup_id"`
	// needed for triggering follow-on steps
	EventStepInstanceID int                    `json:"eventstepinstance_id"`
	ActionSuccess       bool                   `json:"action_success"`
	ActionStdout        string                 `json:"action_stdout"`
	ActionStderr        string                 `json:"action_stderr"`
	Outputs             map[string]interface{} `json:"outputs"`
	// Conditional Check Data
	SkipStep bool `json:"skip_step"`
	// new task or task-related triggers
	TaskID int `json:"task_id"`
	// new payload or payload-related triggers
	PayloadID int `json:"payload_id"`
	// new file trigger
	FileMetaID int `json:"filemeta_id"`
	// new callback trigger or callback-related trigger
	CallbackID int `json:"callback_id"`
	// new response-related trigger
	ResponseID int `json:"response_id"`
	// retry triggers
	EventGroupInstanceID int  `json:"eventgroupinstance_id"`
	RetryAllEventGroups  bool `json:"retry_all_event_groups"`
	// cron trigger
	NextTriggerDate time.Time `json:"next_trigger_date"`
	// response intercept trigger
	ResponseInterceptData string `json:"agent_message"`
	// new tag-related trigger
	TagID int `json:"tag_id"`
}
type CronNotification struct {
	Action       int    `json:"action"`
	EventGroupID int    `json:"eventgroup_id"`
	CronSchedule string `json:"cron_schedule"`
	OperatorID   int    `json:"operator_id"`
	OperationID  int    `json:"operation_id"`
}

const (
	CronActionNewEventGroup = iota
	CronActionTriggerTime
	CronActionTriggerRemove
)

var EventingChannel = make(chan EventNotification, 100)
var CronChannel = make(chan CronNotification, 100)

func initializeEventGroupCronSchedulesOnStart() {
	go listenForCronEvents()
	eventGroups := []databaseStructs.EventGroup{}
	err := database.DB.Select(&eventGroups, `SELECT id, trigger_data, operator_id, operation_id
		FROM eventgroup 
		WHERE deleted=false AND active=true AND trigger=$1`,
		eventing.TriggerCron)
	if err != nil {
		logging.LogError(err, "failed to get event groups")
	}
	for i, _ := range eventGroups {
		triggerData := eventGroups[i].TriggerData.StructValue()
		if _, ok := triggerData["cron"]; ok {
			cronData := triggerData["cron"].(string)
			CronChannel <- CronNotification{
				Action:       CronActionNewEventGroup,
				EventGroupID: eventGroups[i].ID,
				CronSchedule: cronData,
				OperatorID:   eventGroups[i].OperatorID,
				OperationID:  eventGroups[i].OperationID,
			}
		} else {
			logging.LogError(err, "failed to get cron schedule from cron trigger")
		}
	}

}
func listenForCronEvents() {
	s, err := gocron.NewScheduler()
	if err != nil {
		logging.LogError(err, "Failed to start cron scheduler")
		return
	}
	s.Start()
	defer func() { _ = s.Shutdown() }()
	for {
		event := <-CronChannel
		switch event.Action {
		case CronActionNewEventGroup:
			j, err := s.NewJob(
				gocron.CronJob(
					// standard cron tab parsing
					event.CronSchedule,
					false,
				),
				gocron.NewTask(
					func(eventGroupID int, operatorID int, operationID int) {
						// when you trigger, do this thing
						CronChannel <- CronNotification{
							Action:       CronActionTriggerTime,
							EventGroupID: eventGroupID,
							OperatorID:   operatorID,
							OperationID:  operationID,
						}
					},
					event.EventGroupID,
					event.OperatorID,
					event.OperationID),
				gocron.WithName(fmt.Sprintf("%d", event.EventGroupID)))
			if err != nil {
				logging.LogError(err, "failed to create new cron job")
			}
			nextTriggerDate, err := j.NextRun()
			if err != nil {
				logging.LogError(err, "failed to get next run")
			}
			_, err = database.DB.Exec(`UPDATE eventgroup SET next_scheduled_run=$1 WHERE id=$2`,
				nextTriggerDate, event.EventGroupID)
		case CronActionTriggerTime:
			jobs := s.Jobs()
			triggeringName := fmt.Sprintf("%d", event.EventGroupID)
			for i, _ := range jobs {
				if jobs[i].Name() == triggeringName {
					nextRun, err := jobs[i].NextRun()
					if err != nil {
						logging.LogError(err, "failed to get next run")
					}
					EventingChannel <- EventNotification{
						Trigger:         eventing.TriggerCron,
						EventGroupID:    event.EventGroupID,
						NextTriggerDate: nextRun,
						OperatorID:      event.OperatorID,
						OperationID:     event.OperationID,
					}
				}
			}
		case CronActionTriggerRemove:
			jobs := s.Jobs()
			triggeringName := fmt.Sprintf("%d", event.EventGroupID)
			for i, _ := range jobs {
				if jobs[i].Name() == triggeringName {
					err := s.RemoveJob(jobs[i].ID())
					if err != nil {
						logging.LogError(err, "failed to remove job")
					}
				}
			}
		}
	}
}

func listenForEvents() {
	// for each event need to see if:
	//   * this is a trigger kicking off a new event workflow
	//   * this is an event to kick off the next step in an existing workflow
	for {
		event := <-EventingChannel
		switch event.Trigger {
		// manual triggers a new eventgroupinstance
		case eventing.TriggerManual:
			// somebody manually triggered an event group to run
			eventgroupinstanceID, err := eventing.CreateEventGroupInstance(event.EventGroupID,
				eventing.TriggerManual, event.OperatorID, map[string]interface{}{})
			if err != nil {
				logging.LogError(err, "Failed to create new event group instance")
				errMsg := err.Error()
				eventGroup := databaseStructs.EventGroup{}
				err = database.DB.Get(&eventGroup, `SELECT name FROM eventgroup WHERE id=$1`, event.EventGroupID)
				source := "Manual Event Group Trigger"
				if err == nil {
					source = fmt.Sprintf("Manual Event Group Trigger: %s", eventGroup.Name)
				} else {
					logging.LogError(err, "Failed to get event group information")
				}
				go SendAllOperationsMessage(fmt.Sprintf("Error triggering manual workflow: %s", errMsg),
					event.OperationID, source, database.MESSAGE_LEVEL_WARNING)
				continue
			}
			// still need to do something to start processing steps
			go startProcessingNewEventGroupInstanceSteps(eventgroupinstanceID)
		case eventing.TriggerRetry:
			err := restartFailedJobs(event.EventGroupInstanceID)
			if err != nil {
				logging.LogError(err, "Failed to restart instance")
				eventGroup := databaseStructs.EventGroupInstance{}
				errMsg := err.Error()
				err = database.DB.Get(&eventGroup, `SELECT 
    				eventgroup.name "eventgroup.name"
    				FROM eventgroupinstance
    				JOIN eventgroup ON eventgroupinstance.eventgroup_id = eventgroup.id
    				WHERE eventgroupinstance.id=$1`, event.EventGroupInstanceID)
				source := "Retry Event Group Trigger"
				if err == nil {
					source = fmt.Sprintf("Retry Event Group Trigger: %s", eventGroup.EventGroup.Name)
				} else {
					logging.LogError(err, "Failed to get event group information")
				}
				go SendAllOperationsMessage(fmt.Sprintf("Error retriggering workflow: %s", errMsg),
					event.OperationID, source, database.MESSAGE_LEVEL_WARNING)
				continue
			}
		case eventing.TriggerRetryFromStep:
			err := restartFromStepJobs(event.EventStepInstanceID, event.RetryAllEventGroups)
			if err != nil {
				logging.LogError(err, "failed to restart from step")
				continue
			}
		case eventing.TriggerRunAgain:
			// somebody manually triggered an event group to run
			go startProcessingRunAgainGroupInstanceSteps(event.EventGroupInstanceID, event.OperatorID)
		// trigger a workflow by keyword and extra data
		case eventing.TriggerKeyword:
			go findEventGroupsToStart(event)
		case eventing.TriggerCron:
			// cron triggered
			eventgroupinstanceID, err := eventing.CreateEventGroupInstance(event.EventGroupID,
				eventing.TriggerCron, event.OperatorID, map[string]interface{}{})
			if err != nil {
				logging.LogError(err, "Failed to create new event group instance")
				errMsg := err.Error()
				eventGroup := databaseStructs.EventGroup{}
				err = database.DB.Get(&eventGroup, `SELECT name FROM eventgroup WHERE id=$1`, event.EventGroupID)
				source := "Manual Event Group Trigger"
				if err == nil {
					source = fmt.Sprintf("Cron Event Group Trigger: %s", eventGroup.Name)
				} else {
					logging.LogError(err, "Failed to get event group information")
				}
				go SendAllOperationsMessage(fmt.Sprintf("Error triggering cron workflow: %s", errMsg),
					event.OperationID, source, database.MESSAGE_LEVEL_WARNING)
				continue
			}
			_, err = database.DB.Exec(`UPDATE eventgroup SET next_scheduled_run=$1 WHERE id=$2`,
				event.NextTriggerDate, event.EventGroupID)
			// still need to do something to start processing steps
			go startProcessingNewEventGroupInstanceSteps(eventgroupinstanceID)
		case eventing.TriggerMythicStart:
			go findEventGroupsToStart(event)
		// cancel stops a specific eventgroupinstance's remaining steps
		case eventing.TriggerCancel:
			err := eventing.CancelEventGroupInstance(event.EventGroupInstanceID, event.OperatorID)
			if err != nil {
				logging.LogError(err, "Failed to cancel group instance")
				eventGroup := databaseStructs.EventGroupInstance{}
				err = database.DB.Get(&eventGroup, `SELECT 
    				eventgroup.name "eventgroup.name"
    				FROM eventgroupinstance
    				JOIN eventgroup ON eventgroupinstance.eventgroup_id = eventgroup.id
    				WHERE eventgroupinstance.id=$1`, event.EventGroupInstanceID)
				source := "Cancel Event Group Trigger"
				if err == nil {
					source = fmt.Sprintf("Cancel Event Group Trigger: %s", eventGroup.EventGroup.Name)
				}
				go SendAllOperationsMessage(fmt.Sprintf("Error cancelling workflow: %s", err.Error()),
					event.OperationID, source, database.MESSAGE_LEVEL_WARNING)
			}
		// payload starting to build triggers new things to start
		case eventing.TriggerPayloadBuildStart:
			go findEventGroupsToStart(event)
		// payloads finishing can trigger new eventgroupinstance but also finish a step
		case eventing.TriggerPayloadBuildFinish:
			// finishes eventing.ActionPayloadCreate
			go findEventGroupsToStart(event)
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerTaskIntercept:
			go findEventGroupsToStart(event)
		case eventing.TriggerTaskInterceptResponse:
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerResponseIntercept:
			go findEventGroupsToStart(event)
		case eventing.TriggerResponseInterceptResponse:
			processEventFinishAndNextStepStart(event)
		// new tasks can trigger new eventgroupinstance
		case eventing.TriggerTaskCreate:
			go findEventGroupsToStart(event)
		// new tasks getting picked up by agents can trigger new eventgroupinstance
		case eventing.TriggerTaskStart:
			go findEventGroupsToStart(event)
		// tasks finishing can trigger new eventgroupinstance but also finish a step
		case eventing.TriggerTaskFinish:
			// finishes eventing.ActionCreateTask
			go findEventGroupsToStart(event)
			processEventFinishAndNextStepStart(event)
		// new response can trigger a new eventgroupinstance to start
		case eventing.TriggerUserOutput:
			go findEventGroupsToStart(event)
		case eventing.TriggerFileDownload:
			// finishes eventing.ActionCreateFile
			go findEventGroupsToStart(event)
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerFileUpload:
			// finishes eventing.ActionCreateFile
			go findEventGroupsToStart(event)
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerScreenshot:
			go findEventGroupsToStart(event)
		case eventing.TriggerAlert:
			go findEventGroupsToStart(event)
		case eventing.TriggerCallbackNew:
			// finishes eventing.ActionCreateCallback
			go findEventGroupsToStart(event)
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerCustomFunctionResponse:
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerConditionalCheckResponse:
			processEventFinishAndNextStepStart(event)
		case eventing.TriggerCallbackCheckin:
			go findEventGroupsToStart(event)
		case eventing.TriggerTagCreate:
			go findEventGroupsToStart(event)
		default:
			logging.LogDebug("untracked trigger event", "trigger", event.Trigger)
		}
	}
}
func findEventGroupsToStart(eventNotification EventNotification) {
	possibleEventGroups := []databaseStructs.EventGroup{}
	err := database.DB.Select(&possibleEventGroups, `SELECT
    trigger, trigger_data, keywords, id, name 
    FROM eventgroup
    WHERE operation_id=$1 AND active=true AND deleted=false`, eventNotification.OperationID)
	if errors.Is(err, sql.ErrNoRows) {
		return
	}
	if err != nil {
		logging.LogError(err, "failed to query event groups for ")
		return
	}
	if eventNotification.EventGroupID > 0 {
		foundEventgroup := databaseStructs.EventGroup{}
		for i, _ := range possibleEventGroups {
			if possibleEventGroups[i].ID == eventNotification.EventGroupID {
				foundEventgroup = possibleEventGroups[i]
			}
		}
		possibleEventGroups = make([]databaseStructs.EventGroup, 1)
		possibleEventGroups[0] = foundEventgroup
	}
	triggerMetadata := make(map[string]interface{})
	if eventNotification.EventStepInstanceID > 0 {
		triggerMetadata["eventstepinstance_id"] = eventNotification.EventStepInstanceID
	}
	if eventNotification.Keyword != "" {
		triggerMetadata["keyword"] = eventNotification.Keyword
		triggerMetadata["keyword_env_data"] = eventNotification.KeywordEnvData
	}
	if eventNotification.PayloadID > 0 {
		triggerMetadata["payload_id"] = eventNotification.PayloadID
	}
	if eventNotification.FileMetaID > 0 {
		triggerMetadata["filemeta_id"] = eventNotification.FileMetaID
	}
	if eventNotification.CallbackID > 0 {
		triggerMetadata["callback_id"] = eventNotification.CallbackID
	}
	if eventNotification.TaskID > 0 {
		triggerMetadata["task_id"] = eventNotification.TaskID
	}
	if eventNotification.ResponseID > 0 {
		triggerMetadata["response_id"] = eventNotification.ResponseID
	}
	if eventNotification.TagID > 0 {
		triggerMetadata["tag_id"] = eventNotification.TagID
	}
	for key, val := range eventNotification.Outputs {
		triggerMetadata[key] = val
	}
	if eventNotification.ResponseInterceptData != "" {
		triggerMetadata["user_output"] = eventNotification.ResponseInterceptData
	}
	for i := 0; i < len(possibleEventGroups); i++ {
		// trigger by keyword
		if eventing.TriggerKeyword == eventNotification.Trigger {
			if slices.Contains(possibleEventGroups[i].Keywords.StructStringValue(), eventNotification.Keyword) {
				eventgroupinstanceID, err := eventing.CreateEventGroupInstance(possibleEventGroups[i].ID,
					eventNotification.Trigger, eventNotification.OperatorID, triggerMetadata)
				if err != nil {
					logging.LogError(err, "Failed to create new event group instance")
					source := fmt.Sprintf("Keyword Event Group Trigger: %s", eventNotification.Trigger)
					go SendAllOperationsMessage(fmt.Sprintf("Error triggering keyword workflow for %s: %s",
						possibleEventGroups[i].Name, err.Error()),
						eventNotification.OperationID, source, database.MESSAGE_LEVEL_WARNING)
					continue
				}
				// still need to do something to start processing steps
				go startProcessingNewEventGroupInstanceSteps(eventgroupinstanceID)
			}
		} else if possibleEventGroups[i].Trigger == eventNotification.Trigger {
			switch eventNotification.Trigger {
			case eventing.TriggerPayloadBuildStart:
				fallthrough
			case eventing.TriggerPayloadBuildFinish:
				triggerDataNewCallback := TriggerDataFilterPayloadTypes{}
				triggerData := possibleEventGroups[i].TriggerData.StructValue()
				err = mapstructure.Decode(triggerData, &triggerDataNewCallback)
				if err != nil {
					logging.LogError(err, "Failed to decode trigger data")
				}
				if len(triggerDataNewCallback.PayloadTypes) > 0 {
					payload := databaseStructs.Payload{}
					err = database.DB.Get(&payload, `SELECT 
    					payloadtype.name "payloadtype.name"
						FROM payload
						JOIN payloadtype ON payload.payload_type_id = payloadtype.id
						WHERE payload.id=$1`, eventNotification.PayloadID)
					if err != nil {
						logging.LogError(err, "Failed to query callback payload")
					}
					if !slices.Contains(triggerDataNewCallback.PayloadTypes,
						payload.Payloadtype.Name) {
						logging.LogInfo("Not triggering workflow due to payload type restrictions on payload")
						continue
					}
				}
			case eventing.TriggerCallbackCheckin:
				fallthrough
			case eventing.TriggerCallbackNew:
				triggerDataNewCallback := TriggerDataFilterPayloadTypes{}
				triggerData := possibleEventGroups[i].TriggerData.StructValue()
				err = mapstructure.Decode(triggerData, &triggerDataNewCallback)
				if err != nil {
					logging.LogError(err, "Failed to decode trigger data")
				}
				if len(triggerDataNewCallback.PayloadTypes) > 0 {
					callback := databaseStructs.Callback{}
					err = database.DB.Get(&callback, `SELECT 
    					payloadtype.name "payload.payloadtype.name"
						FROM callback
						JOIN payload ON callback.registered_payload_id = payload.id
						JOIN payloadtype ON payload.payload_type_id = payloadtype.id
						WHERE callback.id=$1`, eventNotification.CallbackID)
					if err != nil {
						logging.LogError(err, "Failed to query callback payload")
					}
					if !slices.Contains(triggerDataNewCallback.PayloadTypes,
						callback.Payload.Payloadtype.Name) {
						logging.LogInfo("Not triggering workflow due to payload type restrictions on new callback")
						continue
					}
				}
			case eventing.TriggerTagCreate:
				triggerDataNewTag := TriggerDataFilterTagTypes{}
				triggerData := possibleEventGroups[i].TriggerData.StructValue()
				err = mapstructure.Decode(triggerData, &triggerDataNewTag)
				if err != nil {
					logging.LogError(err, "Failed to decode trigger data")
				}
				if len(triggerDataNewTag.TagTypeNames) > 0 {
					tagTypeName := ""
					err = database.DB.Get(&tagTypeName, `SELECT 
    					tagtype.name "tagtype.name"
    					FROM tag
						JOIN tagtype ON tag.tagtype_id = tagtype.id
						WHERE tag.id=$1`, eventNotification.TagID)
					if err != nil {
						logging.LogError(err, "failed to query tagtype data")
					}
					if !slices.Contains(triggerDataNewTag.TagTypeNames, tagTypeName) {
						logging.LogInfo("Not triggering workflow due to tag type name restrictions on tag")
						continue
					}
				}
			default:
			}
			eventgroupinstanceID, err := eventing.CreateEventGroupInstance(possibleEventGroups[i].ID,
				eventNotification.Trigger, eventNotification.OperatorID, triggerMetadata)
			if err != nil {
				logging.LogError(err, "Failed to create new event group instance")
				source := fmt.Sprintf("Event Group Trigger: %s", eventNotification.Trigger)
				go SendAllOperationsMessage(fmt.Sprintf("Error triggering workflow for %s: %s",
					possibleEventGroups[i].Name, err.Error()),
					eventNotification.OperationID, source, database.MESSAGE_LEVEL_WARNING)
				continue
			}
			// still need to do something to start processing steps
			go startProcessingNewEventGroupInstanceSteps(eventgroupinstanceID)
		}
	}
}
func getStepInstanceOutputs(eventNotification EventNotification, eventStepInstance databaseStructs.EventStepInstance) map[string]interface{} {
	output := eventStepInstance.EventStep.Outputs.StructValue()
	actionOutputData := make(map[string]interface{})
	for key, val := range eventNotification.Outputs {
		output[key] = val
	}
	switch eventStepInstance.EventStep.Action {
	case eventing.ActionPayloadCreate:
		payload := databaseStructs.Payload{ID: eventNotification.PayloadID}
		err := database.DB.Get(&payload, `SELECT * FROM payload WHERE id=$1`, payload.ID)
		if err != nil {
			logging.LogError(err, "Failed to get payload", "id", payload.ID)
			return output
		}
		triggerBytes, err := json.Marshal(payload)
		if err != nil {
			logging.LogError(err, "failed to marshal task into bytes for saving trigger metadata")
			return output
		}
		err = json.Unmarshal(triggerBytes, &actionOutputData)
		for key, val := range eventStepInstance.EventStep.Outputs.StructValue() {
			logging.LogInfo("looping through outputs of stepinstance", "key", key, "value", val)
			valString := val.(string)
			if _, ok := actionOutputData[valString]; !ok {
				output[key] = valString
			} else {
				output[key] = actionOutputData[valString]
			}
		}
	case eventing.ActionCreateTask:
		task := databaseStructs.Task{ID: eventNotification.TaskID}
		err := database.DB.Get(&task, `SELECT * FROM task WHERE id=$1`, task.ID)
		if err != nil {
			logging.LogError(err, "Failed to get task", "id", task.ID)
			return output
		}
		triggerBytes, err := json.Marshal(task)
		if err != nil {
			logging.LogError(err, "failed to marshal task into bytes for saving trigger metadata")
			return output
		}
		err = json.Unmarshal(triggerBytes, &actionOutputData)
		for key, val := range eventStepInstance.EventStep.Outputs.StructValue() {
			logging.LogInfo("looping through outputs of stepinstance", "key", key, "value", val)
			valString := val.(string)
			if _, ok := actionOutputData[valString]; !ok {
				output[key] = valString
			} else {
				output[key] = actionOutputData[valString]
			}
		}
	case eventing.ActionCreateCallback:
		callback := databaseStructs.Callback{ID: eventNotification.CallbackID}
		err := database.DB.Select(&callback, `SELECT * FROM callback WHERE id=$1`, eventNotification.CallbackID)
		if err != nil {
			logging.LogError(err, "Failed to get callback", "id", callback.ID)
			return output
		}
		triggerBytes, err := json.Marshal(callback)
		if err != nil {
			logging.LogError(err, "failed to marshal task into bytes for saving trigger metadata")
			return output
		}
		err = json.Unmarshal(triggerBytes, &actionOutputData)
		for key, val := range eventStepInstance.EventStep.Outputs.StructValue() {
			logging.LogInfo("looping through outputs of stepinstance", "key", key, "value", val)
			valString := val.(string)
			if _, ok := actionOutputData[valString]; !ok {
				output[key] = valString
			} else {
				output[key] = actionOutputData[valString]
			}
		}
	case eventing.ActionCustomFunction:
	case eventing.ActionConditionalCheck:
	case eventing.ActionInterceptTask:
	case eventing.ActionInterceptResponse:
	case eventing.ActionSendWebhook:
	case eventing.ActionCreateAlert:
	default:
		logging.LogError(nil, "unknown action", "action", eventStepInstance.EventStep.Action)
	}
	logging.LogInfo("returning step output map", "output", output)
	return output
}
func processEventFinishAndNextStepStart(eventNotification EventNotification) {
	if eventNotification.EventStepInstanceID == 0 {
		return
	}
	// need to see if there's an eventstepinstance that's running with the specified eventgroupinstance
	triggeringStep := databaseStructs.EventStepInstance{}
	err := database.DB.Get(&triggeringStep, `SELECT 
    eventstepinstance.id, eventstepinstance.status, eventstepinstance.order, eventstepinstance.eventgroupinstance_id,
	eventstepinstance.operator_id, eventstepinstance.operation_id, eventstepinstance.continue_on_error,
	eventstepinstance.action_data, eventstepinstance.inputs, eventstepinstance.end_timestamp,
	eventgroupinstance.id "eventgroupinstance.id",
    eventgroupinstance.current_order_step "eventgroupinstance.current_order_step",
	eventgroupinstance.total_order_steps "eventgroupinstance.total_order_steps",
	eventgroupinstance.status "eventgroupinstance.status",
	eventstep.action "eventstep.action",
	eventstep.outputs "eventstep.outputs",
	eventstep.name "eventstep.name"
	FROM eventstepinstance 
	JOIN eventgroupinstance ON eventstepinstance.eventgroupinstance_id = eventgroupinstance.id
	JOIN eventstep on eventstepinstance.eventstep_id = eventstep.id
	WHERE eventstepinstance.id=$1`,
		eventNotification.EventStepInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to get eventstep instance information")
		return
	}
	// get all event steps for this event group instance
	eventSteps := []databaseStructs.EventStepInstance{}
	err = database.DB.Select(&eventSteps, `SELECT 
    	eventstepinstance.id, eventstepinstance.status, eventstepinstance.order, eventstepinstance.eventgroupinstance_id,
		eventstepinstance.operator_id, eventstepinstance.operation_id, eventstepinstance.continue_on_error,
		eventstepinstance.end_timestamp,
    	eventstep.depends_on "eventstep.depends_on",
    	eventstep.name "eventstep.name"
		FROM eventstepinstance 
		JOIN eventstep on eventstepinstance.eventstep_id = eventstep.id
		WHERE eventstepinstance.eventgroupinstance_id=$1`,
		triggeringStep.EventGroupInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to query eventstepinstances")
		return
	}
	foundStepToFinish := false
	stepOutput := getStepInstanceOutputs(eventNotification, triggeringStep)
	// process potential steps for skips
	inputs := triggeringStep.ActionData.StructValue()
	skipSteps := []string{}
	if eventNotification.Trigger == eventing.TriggerConditionalCheckResponse {
		if eventNotification.SkipStep {
			if stepsInterface, ok := inputs["steps"]; ok {
				for _, step := range stepsInterface.([]interface{}) {
					skipSteps = append(skipSteps, step.(string))
				}
			} else {
				logging.LogError(nil, "failed to get steps when skipping steps")
			}
		}
	}
	for i := 0; i < len(eventSteps); i++ {
		if eventNotification.Trigger == eventing.TriggerConditionalCheckResponse {
			if eventNotification.SkipStep {
				if utils.SliceContains(skipSteps, eventSteps[i].EventStep.Name) {
					if eventSteps[i].Status == eventing.EventGroupInstanceStatusQueued {
						eventSteps[i].Status = eventing.EventGroupInstanceStatusSkipped
						eventSteps[i].EndTimestamp.Valid = true
						eventSteps[i].EndTimestamp.Time = time.Now().UTC()
						eventSteps[i].CreatedAt = eventSteps[i].EndTimestamp.Time
						_, err = database.DB.NamedExec(`UPDATE eventstepinstance SET
                             status=:status, end_timestamp=:end_timestamp, outputs=:outputs, created_at=:created_at
                             WHERE id=:id`, eventSteps[i])
					}
				}
			}
		}
		if eventSteps[i].ID == eventNotification.EventStepInstanceID {
			// we found the matching step to finish
			foundStepToFinish = true
			if eventNotification.ActionSuccess {
				eventSteps[i].Status = eventing.EventGroupInstanceStatusSuccess
			} else {
				eventSteps[i].Status = eventing.EventGroupInstanceStatusError
			}
			eventSteps[i].Stdout = eventNotification.ActionStdout
			eventSteps[i].Stderr = eventNotification.ActionStderr
			eventSteps[i].EndTimestamp.Valid = true
			eventSteps[i].EndTimestamp.Time = time.Now().UTC()
			eventSteps[i].Outputs = GetMythicJSONTextFromStruct(stepOutput)
			_, err = database.DB.NamedExec(`UPDATE eventstepinstance SET
                             status=:status, stdout=:stdout, stderr=:stderr, end_timestamp=:end_timestamp, outputs=:outputs
                             WHERE id=:id`, eventSteps[i])
			if err != nil {
				logging.LogError(err, "Failed to update eventstepinstance")
			}
			_, err = database.DB.Exec(`UPDATE apitokens SET deleted=true, active=false 
                 WHERE eventstepinstance_id=$1`, triggeringStep.ID)
			if err != nil {
				logging.LogError(err, "Failed to mark apitoken as deleted")
			}
			if !eventNotification.ActionSuccess && !triggeringStep.ContinueOnError {
				markStepInstanceAsError(triggeringStep, eventNotification.ActionStderr)
				return
			}
		}
	}
	if !foundStepToFinish {
		logging.LogError(nil, "failed to find a matching step to mark as completed")
		return
	}
	err = findNextStepToStartAndStartIt(eventSteps, triggeringStep.EventGroupInstance)
	if err != nil {
		_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2
		WHERE id=$3`, eventing.EventGroupInstanceStatusError, time.Now().UTC(), triggeringStep.EventGroupInstance)
	}
}

// startProcessingNewEventGroupInstanceSteps starts Order==0 steps for new event group
func startProcessingNewEventGroupInstanceSteps(eventgroupinstanceID int) {
	eventStepInstances := []databaseStructs.EventStepInstance{}
	err := database.DB.Select(&eventStepInstances, `SELECT 
    	id, "order", eventgroupinstance_id, continue_on_error 
		FROM eventstepinstance WHERE eventgroupinstance_id=$1`,
		eventgroupinstanceID)
	if err != nil {
		logging.LogError(err, "Failed to get eventstep instances")
		return
	}
	for i, _ := range eventStepInstances {
		if eventStepInstances[i].Order == 0 {
			err = startEventStepInstance(eventStepInstances[i].ID)
			if err != nil {
				markStepInstanceAsError(eventStepInstances[i], err.Error())
				if !eventStepInstances[i].ContinueOnError {
					return
				}
			}
		}
	}
}
func startProcessingRunAgainGroupInstanceSteps(oldEventGroupInstanceID int, newOperatorID int) {
	// copy the old event group's metadata to the new event group
	oldEventGroupInstance := databaseStructs.EventGroupInstance{}
	err := database.DB.Get(&oldEventGroupInstance, `SELECT 
    	eventgroupinstance.trigger, eventgroupinstance.trigger_metadata, eventgroupinstance.id,
    	eventgroupinstance.eventgroup_id, eventgroupinstance.operation_id,
    	eventgroup.name "eventgroup.name"
		FROM eventgroupinstance 
		JOIN eventgroup ON eventgroupinstance.eventgroup_id = eventgroup.id
		WHERE eventgroupinstance.id=$1`, oldEventGroupInstanceID)
	if err != nil {
		logging.LogError(err, "failed to get old eventgroup information")
		return
	}
	eventgroupinstanceID, err := eventing.CreateEventGroupInstance(oldEventGroupInstance.EventGroupID,
		oldEventGroupInstance.Trigger, newOperatorID, oldEventGroupInstance.TriggerMetadata.StructValue())
	if err != nil {
		logging.LogError(err, "Failed to create new event group instance")
		source := fmt.Sprintf("RunAgain Event Group Trigger: %s", oldEventGroupInstance.EventGroup.Name)
		go SendAllOperationsMessage(fmt.Sprintf("Error triggering keyword workflow for %s: %s",
			oldEventGroupInstance.EventGroup.Name, err.Error()),
			oldEventGroupInstance.OperationID, source, database.MESSAGE_LEVEL_WARNING)
		return
	}
	oldEventGroupInstance.ID = eventgroupinstanceID
	_, err = database.DB.NamedExec(`UPDATE eventgroupinstance SET 
                              trigger=:trigger,
                              environment=:environment, trigger_metadata=:trigger_metadata
                              WHERE id=:id`, oldEventGroupInstance)
	if err != nil {
		logging.LogError(err, "failed to update eventgroup instance information")
		return
	}
	// still need to do something to start processing steps
	go startProcessingNewEventGroupInstanceSteps(eventgroupinstanceID)
}
func findNextStepToStartAndStartIt(eventSteps []databaseStructs.EventStepInstance, eventGroupInstance databaseStructs.EventGroupInstance) error {
	currentStepOrder := eventGroupInstance.CurrentOrderStep
	// marked current step as done, now to see if there are any others to kick off
	allCurrentStepsAreDone := true
	finalGroupInstanceStatus := eventing.EventGroupInstanceStatusSuccess
	for allCurrentStepsAreDone {
		// make sure all steps of the current order are done before trying to start
		for i := 0; i < len(eventSteps); i++ {
			if (eventSteps[i].Status == eventing.EventGroupInstanceStatusRunning ||
				eventSteps[i].Status == eventing.EventGroupInstanceStatusQueued) &&
				eventSteps[i].Order == currentStepOrder {
				allCurrentStepsAreDone = false
			}
			if finalGroupInstanceStatus == eventing.EventGroupInstanceStatusSuccess && eventSteps[i].Status == eventing.EventGroupInstanceStatusError {
				finalGroupInstanceStatus = eventing.EventGroupInstanceStatusError
			}
			if eventSteps[i].Status == eventing.EventGroupInstanceStatusCancelled {
				finalGroupInstanceStatus = eventing.EventGroupInstanceStatusCancelled
			}
		}
		if allCurrentStepsAreDone {
			currentStepOrder += 1
			if currentStepOrder > eventGroupInstance.TotalOrderSteps {
				// we're done with all the steps
				_, err := database.DB.Exec(`UPDATE eventgroupinstance SET
                          status=$1, end_timestamp=$2 
                          WHERE id=$3`, finalGroupInstanceStatus,
					time.Now().UTC(), eventGroupInstance.ID)
				if err != nil {
					logging.LogError(err, "failed to update eventgroupinstance to done")
				}
				return err
			}
			// update eventgroup instance current step
			_, err := database.DB.Exec(`UPDATE eventgroupinstance SET
                              current_order_step=$1
                              WHERE id=$2`,
				currentStepOrder,
				eventGroupInstance.ID)
			if err != nil {
				logging.LogError(err, "failed to update eventgroupinstance current step to the next step")
			}
		}
	}

	for i := 0; i < len(eventSteps); i++ {
		// if the current step is queued and part of order 1+
		if eventSteps[i].Status == eventing.EventGroupInstanceStatusQueued {
			allDependsOnCompleted := true
			if eventSteps[i].Order > 0 {
				// get all the current step's depends_on values
				dependsOn := eventSteps[i].EventStep.DependsOn.StructStringValue()
				// loop through all the steps and see if each one matching a depends_on name has an end timestamp set
				for j := 0; j < len(eventSteps); j++ {
					if slices.Contains(dependsOn, eventSteps[j].EventStep.Name) {
						if !eventSteps[j].EndTimestamp.Valid {
							allDependsOnCompleted = false
							break
						}
					}
				}
			}
			// if all the current step's depends_on are done, then this step can start
			if allDependsOnCompleted {
				err := startEventStepInstance(eventSteps[i].ID)
				if err != nil {
					markStepInstanceAsError(eventSteps[i], err.Error())
					if !eventSteps[i].ContinueOnError {
						return err
					}
					eventSteps[i].Status = eventing.EventGroupInstanceStatusError
				}
			}
		}
	}
	// lastly check if any steps are still running / queued
	for i := 0; i < len(eventSteps); i++ {
		if eventSteps[i].Status == eventing.EventGroupInstanceStatusQueued ||
			eventSteps[i].Status == eventing.EventGroupInstanceStatusRunning {
			// something is still running or about to run
			return nil
		}
		if eventSteps[i].Status != eventing.EventGroupInstanceStatusSuccess {
			return errors.New(fmt.Sprintf("Step '%s' failed", eventSteps[i].EventStep.Name))
		}
	}
	return nil
}
func startEventStepInstance(eventStepInstanceID int) error {
	eventStepInstance := databaseStructs.EventStepInstance{}
	err := database.DB.Get(&eventStepInstance, `SELECT 
    	eventstepinstance.id, eventstepinstance.status, eventstepinstance.order, eventstepinstance.eventgroupinstance_id,
    	eventstepinstance.operator_id, eventstepinstance.operation_id, eventstepinstance.environment,
    	eventstepinstance.continue_on_error,
    	eventstep.action "eventstep.action",
    	eventstep.name "eventstep.name",
    	eventstep.action_data "eventstep.action_data",
    	eventstep.inputs "eventstep.inputs",
    	eventstep.outputs "eventstep.outputs",
    	eventgroupinstance.environment "eventgroupinstance.environment",
    	eventgroupinstance.eventgroup_id "eventgroupinstance.eventgroup_id"
		FROM eventstepinstance 
		JOIN eventstep ON eventstepinstance.eventstep_id = eventstep.id
		JOIN eventgroupinstance ON eventstepinstance.eventgroupinstance_id = eventgroupinstance.id
		WHERE eventstepinstance.id=$1`,
		eventStepInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to get eventstep instance")
		return err
	}
	allEventSteps := []databaseStructs.EventStepInstance{}
	err = database.DB.Select(&allEventSteps, `SELECT 
		eventstepinstance.outputs, 
		eventstep.name "eventstep.name"
		FROM eventstepinstance
		JOIN eventstep ON eventstepinstance.eventstep_id = eventstep.id
		WHERE eventgroupinstance_id=$1`, eventStepInstance.EventGroupInstanceID)
	if err != nil {
		logging.LogError(err, "failed to get all event step instances")
		return err
	}
	// still need to process inputs from outputs of previous steps
	inputs := eventStepInstance.EventStep.Inputs.StructValue()
	stepEnv := eventStepInstance.Environment.StructValue()
	groupEnv := eventStepInstance.EventGroupInstance.Environment.StructValue()
	actionDataString := eventStepInstance.EventStep.ActionData.String()
	for key, val := range eventStepInstance.EventStep.Inputs.StructValue() {
		switch val.(type) {
		case string:
		default:
			logging.LogDebug("step input value isn't string, keeping it and moving on")
			inputs[key] = val
			actionDataString = replaceVariableInActionDataString(actionDataString, key, val)
			continue
		}
		eventStepInputPieces := strings.Split(val.(string), ".")
		if len(eventStepInputPieces) < 2 {
			logging.LogDebug("input Piece wasn't in StepName.VariableName format", "input", val)
			inputs[key] = val
			actionDataString = replaceVariableInActionDataString(actionDataString, key, val)
			continue
		}
		if eventStepInputPieces[0] == "env" {
			if _, ok := groupEnv[eventStepInputPieces[1]]; ok {
				inputs[key] = groupEnv[eventStepInputPieces[1]]
				actionDataString = replaceVariableInActionDataString(actionDataString, key, groupEnv[eventStepInputPieces[1]])
			}
			if _, ok := stepEnv[eventStepInputPieces[1]]; ok {
				inputs[key] = stepEnv[eventStepInputPieces[1]]
				actionDataString = replaceVariableInActionDataString(actionDataString, key, stepEnv[eventStepInputPieces[1]])
			}
			continue
		}
		if eventStepInputPieces[0] == "upload" {
			fileMeta := databaseStructs.Filemeta{}
			filename := strings.Join(eventStepInputPieces[1:], ".")
			err = database.DB.Get(&fileMeta, `SELECT agent_file_id 
				FROM filemeta 
				WHERE operation_id=$1 AND filename LIKE $2 AND deleted=false AND is_payload=false AND is_download_from_agent=false
				ORDER BY id DESC`,
				eventStepInstance.OperationID, "%"+filename+"%")
			if err != nil {
				logging.LogError(err, "Failed to find file")
			}
			inputs[key] = fileMeta.AgentFileID
			actionDataString = replaceVariableInActionDataString(actionDataString, key, fileMeta.AgentFileID)
		}
		if eventStepInputPieces[0] == "download" {
			fileMeta := databaseStructs.Filemeta{}
			filename := strings.Join(eventStepInputPieces[1:], ".")
			err = database.DB.Get(&fileMeta, `SELECT agent_file_id 
				FROM filemeta 
				WHERE operation_id=$1 AND filename LIKE $2 AND deleted=false AND is_payload=false AND is_download_from_agent=true
				ORDER BY id DESC`,
				eventStepInstance.OperationID, "%"+filename+"%")
			if err != nil {
				logging.LogError(err, "Failed to find file")
			}
			inputs[key] = fileMeta.AgentFileID
			actionDataString = replaceVariableInActionDataString(actionDataString, key, fileMeta.AgentFileID)
		}
		if eventStepInputPieces[0] == "workflow" {
			fileMeta := databaseStructs.Filemeta{}
			filename := strings.Join(eventStepInputPieces[1:], ".")
			err = database.DB.Get(&fileMeta, `SELECT agent_file_id 
				FROM filemeta 
				WHERE operation_id=$1 AND filename LIKE $2 AND deleted=false AND eventgroup_id=$3
				ORDER BY id DESC`,
				eventStepInstance.OperationID, filename, eventStepInstance.EventGroupInstance.EventGroupID)
			if err != nil {
				logging.LogError(err, "Failed to find file")
			}
			inputs[key] = fileMeta.AgentFileID
			actionDataString = replaceVariableInActionDataString(actionDataString, key, fileMeta.AgentFileID)
		}
		if eventStepInputPieces[0] == "mythic" {
			if eventStepInputPieces[1] == "apitoken" {
				// save off the access_token as an API token and then return it
				apiToken := databaseStructs.Apitokens{
					TokenValue: "",
					OperatorID: eventStepInstance.OperatorID,
					TokenType:  mythicjwt.AUTH_METHOD_EVENT,
					Active:     true,
					Name:       fmt.Sprintf("Generated Event API Token for step \"%s\"", eventStepInstance.EventStep.Name),
					CreatedBy:  eventStepInstance.OperatorID,
				}
				apiToken.EventStepInstanceID.Valid = true
				apiToken.EventStepInstanceID.Int64 = int64(eventStepInstance.ID)
				statement, err := database.DB.PrepareNamed(`INSERT INTO apitokens 
						(token_value, operator_id, token_type, active, "name", created_by, eventstepinstance_id) 
						VALUES
						(:token_value, :operator_id, :token_type, :active, :name, :created_by, :eventstepinstance_id)
						RETURNING id`)
				if err != nil {
					logging.LogError(err, "Failed to insert apitokens")
					continue
				}
				err = statement.Get(&apiToken.ID, apiToken)
				if err != nil {
					logging.LogError(err, "Failed to get new apitoken")
					continue
				}
				accessToken, _, _, err := mythicjwt.GenerateJWT(databaseStructs.Operator{ID: eventStepInstance.OperatorID},
					mythicjwt.AUTH_METHOD_EVENT, eventStepInstance.ID, apiToken.ID)
				if err != nil {
					logging.LogError(err, "Failed to generate access token")
					continue
				}
				apiToken.TokenValue = accessToken
				_, err = database.DB.Exec(`UPDATE apitokens SET token_value=$1 WHERE id=$2`, apiToken.TokenValue, apiToken.ID)
				if err != nil {
					logging.LogError(err, "Failed to update apitoken")
					continue
				}
				inputs[key] = apiToken.TokenValue
			}
		}
		for i := 0; i < len(allEventSteps); i++ {
			if allEventSteps[i].EventStep.Name == eventStepInputPieces[0] {
				targetStepOutputs := allEventSteps[i].Outputs.StructValue()
				for targetKey, targetValue := range targetStepOutputs {
					if targetKey == eventStepInputPieces[1] {
						inputs[key] = targetValue
						actionDataString = replaceVariableInActionDataString(actionDataString, key, targetValue)
					}
				}
			}
		}
	}
	eventStepInstance.Inputs = GetMythicJSONTextFromStruct(inputs)
	// update action data based on event step input as needed
	actionDataMap := make(map[string]interface{})
	logging.LogInfo("data after replacement", "action_data", actionDataString)
	err = json.Unmarshal([]byte(actionDataString), &actionDataMap)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal action data")
	}
	eventStepInstance.Status = eventing.EventGroupInstanceStatusRunning
	eventStepInstance.CreatedAt = time.Now().UTC()
	eventStepInstance.ActionData = GetMythicJSONTextFromStruct(actionDataMap)
	_, err = database.DB.NamedExec(`UPDATE eventstepinstance SET 
                             status=:status, inputs=:inputs, created_at=:created_at, action_data=:action_data 
                         WHERE id=:id`,
		eventStepInstance)
	if err != nil {
		logging.LogError(err, "failed to update eventstep status to running")
		return err
	}
	switch eventStepInstance.EventStep.Action {
	case eventing.ActionPayloadCreate:
		return startEventStepInstanceActionCreatePayload(eventStepInstance, actionDataMap)
	case eventing.ActionCreateCallback:
		return startEventStepInstanceActionCreateCallback(eventStepInstance, actionDataMap)
	case eventing.ActionCreateTask:
		return startEventStepInstanceActionCreateTask(eventStepInstance, actionDataMap)
	case eventing.ActionCreateAlert:
		return startEventStepInstanceActionCreateAlert(eventStepInstance, actionDataMap)
	case eventing.ActionSendWebhook:
		return startEventStepInstanceActionSendWebhook(eventStepInstance, actionDataMap)
	case eventing.ActionCustomFunction:
		return startEventStepInstanceActionCustomFunction(eventStepInstance, inputs, actionDataMap, groupEnv)
	case eventing.ActionConditionalCheck:
		return startEventStepInstanceActionConditionalCheck(eventStepInstance, inputs, actionDataMap, groupEnv)
	case eventing.ActionInterceptTask:
		return startEventStepInstanceActionInterceptTask(eventStepInstance, inputs, actionDataMap, groupEnv)
	case eventing.ActionInterceptResponse:
		return startEventStepInstanceActionInterceptResponse(eventStepInstance, inputs, actionDataMap, groupEnv)
	default:
	}
	return nil
}
func replaceVariableInActionDataString(actionDataString string, key string, val interface{}) string {
	switch v := val.(type) {
	case string:
		return strings.ReplaceAll(actionDataString, key, fmt.Sprintf("%v", v))
	default:
		return strings.ReplaceAll(actionDataString, fmt.Sprintf("\"%s\"", key),
			fmt.Sprintf("%v", v))
	}
}

// starting a specific step action
func startEventStepInstanceActionCreatePayload(eventStepInstance databaseStructs.EventStepInstance, actionDataMap map[string]interface{}) error {
	eventData := EventActionDataCreatePayload{}
	err := mapstructure.Decode(actionDataMap, &eventData.PayloadConfiguration)
	if err != nil {
		logging.LogError(err, "Failed to decode action data")
		return err
	}
	eventData.UUID = ""
	eventData.PayloadConfiguration.EventStepInstance = eventStepInstance.ID
	operatorOperation := databaseStructs.Operatoroperation{
		CurrentOperator: databaseStructs.Operator{
			ID: eventStepInstance.OperatorID,
		},
		CurrentOperation: databaseStructs.Operation{
			ID: eventStepInstance.OperationID,
		},
	}
	_, _, err = RegisterNewPayload(eventData.PayloadConfiguration, &operatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to register payload for CreatePayloadWebhook")
	}
	return err
}
func startEventStepInstanceActionCreateCallback(eventStepInstance databaseStructs.EventStepInstance, actionDataMap map[string]interface{}) error {
	eventData := MythicRPCCallbackCreateMessage{}
	err := mapstructure.Decode(actionDataMap, &eventData)
	if err != nil {
		logging.LogError(err, "Failed to decode action data")
		return err
	}
	eventData.EventStepInstanceID = &eventStepInstance.ID
	callbackCreateResponse := MythicRPCCallbackCreate(eventData)
	if !callbackCreateResponse.Success {
		logging.LogError(nil, callbackCreateResponse.Error)
		return errors.New(callbackCreateResponse.Error)
	}
	processEventFinishAndNextStepStart(EventNotification{
		EventStepInstanceID: eventStepInstance.ID,
		ActionSuccess:       true,
	})
	return nil
}
func startEventStepInstanceActionCreateTask(eventStepInstance databaseStructs.EventStepInstance, actionDataMap map[string]interface{}) error {
	eventData := EventActionDataCreateTask{}
	err := mapstructure.Decode(actionDataMap, &eventData)
	if err != nil {
		logging.LogError(err, "failed to decode action data")
		return err
	}
	taskingLocation := "mythic_eventing"
	createTaskInput := CreateTaskInput{
		CallbackDisplayID:   eventData.CallbackDisplayID,
		CommandName:         eventData.CommandName,
		PayloadType:         eventData.PayloadType,
		Token:               eventData.Token,
		Params:              eventData.Params,
		ParameterGroupName:  eventData.ParameterGroupName,
		TaskingLocation:     &taskingLocation,
		OperatorID:          eventStepInstance.OperatorID,
		CurrentOperationID:  eventStepInstance.OperationID,
		EventStepInstanceID: eventStepInstance.ID,
		ParentTaskID:        eventData.ParentTaskID,
		IsInteractiveTask:   eventData.IsInteractiveTask,
		InteractiveTaskType: eventData.InteractiveTaskType,
	}
	if eventData.ParamDictionary != nil {
		paramsString, _ := json.Marshal(eventData.ParamDictionary)
		createTaskInput.Params = string(paramsString)
	}
	createTaskInput.OriginalParams = &createTaskInput.Params
	err = automatedTaskCreateAugmentInput(&createTaskInput)
	if err != nil {
		logging.LogError(err, "failed to add disabled command info to createTaskInput")
		return err
	}
	creationResponse := CreateTask(createTaskInput)
	if creationResponse.Status != "success" {
		return errors.New(creationResponse.Error)
	}
	return nil
}
func startEventStepInstanceActionCreateAlert(eventStepInstance databaseStructs.EventStepInstance, actionDataMap map[string]interface{}) error {
	eventData := EventActionDataCreateAlert{}
	err := mapstructure.Decode(actionDataMap, &eventData)
	if err != nil {
		logging.LogError(err, "failed to decode action data")
		return err
	}
	go SendAllOperationsMessage(eventData.Alert, eventStepInstance.OperationID, eventData.Source, eventData.Level)
	if eventData.SendWebhook {
		databaseOperation := databaseStructs.Operation{ID: eventStepInstance.OperationID}
		err = database.DB.Get(&databaseOperation, `SELECT "name", "webhook", "channel" FROM operation WHERE id=$1`, databaseOperation.ID)
		if err != nil {
			logging.LogError(err, "failed to get operation information")
			return err
		}
		if err = RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
			OperationID:      eventStepInstance.OperationID,
			OperationName:    databaseOperation.Name,
			OperationWebhook: databaseOperation.Webhook,
			OperationChannel: databaseOperation.Channel,
			OperatorUsername: "",
			Action:           WEBHOOK_TYPE_CUSTOM,
			Data: map[string]interface{}{
				"alert":         eventData.Alert,
				"webhook_alert": eventData.WebhookAlert,
				"source":        eventData.Source,
			},
		}); err != nil {
			logging.LogError(err, "Failed to send webhook")
			return err
		}
	}
	processEventFinishAndNextStepStart(EventNotification{
		EventStepInstanceID: eventStepInstance.ID,
		ActionSuccess:       true,
	})
	return nil
}
func startEventStepInstanceActionSendWebhook(eventStepInstance databaseStructs.EventStepInstance, actionDataMap map[string]interface{}) error {
	eventData := EventActionDataSendWebhook{}
	err := mapstructure.Decode(actionDataMap, &eventData)
	if err != nil {
		logging.LogError(err, "failed to decode action data")
		return err
	}
	databaseOperation := databaseStructs.Operation{ID: eventStepInstance.OperationID}
	err = database.DB.Get(&databaseOperation, `SELECT "name", "webhook", "channel" FROM operation WHERE id=$1`, databaseOperation.ID)
	if err != nil {
		logging.LogError(err, "failed to get operation information")
		return err
	}
	if err = RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
		OperationID:      eventStepInstance.OperationID,
		OperationName:    databaseOperation.Name,
		OperationWebhook: databaseOperation.Webhook,
		OperationChannel: databaseOperation.Channel,
		OperatorUsername: "",
		Action:           WEBHOOK_TYPE_CUSTOM,
		Data:             eventData.WebhookData,
	}); err != nil {
		logging.LogError(err, "Failed to send webhook")
		return err
	}

	processEventFinishAndNextStepStart(EventNotification{
		EventStepInstanceID: eventStepInstance.ID,
		ActionSuccess:       true,
	})
	return nil
}
func startEventStepInstanceActionCustomFunction(eventStepInstance databaseStructs.EventStepInstance, inputs map[string]interface{},
	actionDataMap map[string]interface{},
	environment map[string]interface{}) error {
	functionName := ""
	containerName := ""
	if _, ok := actionDataMap["container_name"]; ok {
		containerName = actionDataMap["container_name"].(string)
	} else {
		return errors.New("missing container_name in action_data")
	}
	if _, ok := actionDataMap["function_name"]; ok {
		functionName = actionDataMap["function_name"].(string)
	} else {
		return errors.New("missing function_name in action_data")
	}
	return RabbitMQConnection.SendEventingCustomFunction(NewCustomEventingMessage{
		EventStepInstanceID: eventStepInstance.ID,
		Environment:         environment,
		Inputs:              inputs,
		ActionData:          actionDataMap,
		FunctionName:        functionName,
		ContainerName:       containerName,
	})
}
func startEventStepInstanceActionConditionalCheck(eventStepInstance databaseStructs.EventStepInstance, inputs map[string]interface{},
	actionDataMap map[string]interface{},
	environment map[string]interface{}) error {
	functionName := ""
	containerName := ""
	if _, ok := actionDataMap["container_name"]; ok {
		containerName = actionDataMap["container_name"].(string)
	} else {
		return errors.New("missing container_name in action_data")
	}
	if _, ok := actionDataMap["function_name"]; ok {
		functionName = actionDataMap["function_name"].(string)
	} else {
		return errors.New("missing function_name in action_data")
	}
	if _, ok := actionDataMap["steps"]; !ok {
		return errors.New("missing steps in action_data")
	}
	return RabbitMQConnection.SendEventingConditionalCheckFunction(ConditionalCheckEventingMessage{
		EventStepInstanceID: eventStepInstance.ID,
		Environment:         environment,
		Inputs:              inputs,
		ActionData:          actionDataMap,
		FunctionName:        functionName,
		ContainerName:       containerName,
	})
}
func startEventStepInstanceActionInterceptTask(eventStepInstance databaseStructs.EventStepInstance, inputs map[string]interface{},
	actionDataMap map[string]interface{},
	environment map[string]interface{}) error {
	containerName := ""
	if _, ok := actionDataMap["container_name"]; ok {
		containerName = actionDataMap["container_name"].(string)
	} else {
		return errors.New("missing container_name in action_data")
	}
	TaskID := 0
	if _, ok := environment["id"]; ok {
		TaskID = int(environment["id"].(float64))
	} else {
		return errors.New("missing id in environment")
	}
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT callback_id FROM task WHERE id=$1`, TaskID)
	if err != nil {
		logging.LogError(err, "failed to get callback information for task in task_intercept")
	}
	return RabbitMQConnection.SendEventingTaskIntercept(TaskInterceptMessage{
		EventStepInstanceID: eventStepInstance.ID,
		TaskID:              TaskID,
		CallbackID:          task.CallbackID,
		Environment:         environment,
		Inputs:              inputs,
		ActionData:          actionDataMap,
		ContainerName:       containerName,
	})
}
func startEventStepInstanceActionInterceptResponse(eventStepInstance databaseStructs.EventStepInstance, inputs map[string]interface{},
	actionDataMap map[string]interface{},
	environment map[string]interface{}) error {
	containerName := ""
	if _, ok := actionDataMap["container_name"]; ok {
		containerName = actionDataMap["container_name"].(string)
	} else {
		return errors.New("missing container_name in action_data")
	}
	ResponseID := 0
	if _, ok := environment["response_id"]; ok {
		ResponseID = int(environment["response_id"].(float64))
	} else {
		return errors.New("missing id in environment")
	}
	return RabbitMQConnection.SendEventingResponseIntercept(ResponseInterceptMessage{
		EventStepInstanceID: eventStepInstance.ID,
		ResponseID:          ResponseID,
		Environment:         environment,
		Inputs:              inputs,
		ActionData:          actionDataMap,
		ContainerName:       containerName,
	})
}
func restartFailedJobs(eventgroupInstanceID int) error {
	_, err := database.DB.Exec(`UPDATE eventstepinstance 
		SET status=$1, end_timestamp=$2 WHERE eventgroupinstance_id=$3 AND status=$4 OR status=$5`,
		eventing.EventGroupInstanceStatusQueued, nil, eventgroupInstanceID,
		eventing.EventGroupInstanceStatusError, eventing.EventGroupInstanceStatusCancelled)
	if err != nil {
		logging.LogError(err, "Failed to update event steps")
		return err
	}
	_, err = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2, current_order_step=$3
		WHERE id=$4`, eventing.EventGroupInstanceStatusRunning, nil, 0, eventgroupInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to update event steps")
		return err
	}
	eventSteps := []databaseStructs.EventStepInstance{}
	err = database.DB.Select(&eventSteps, `SELECT 
    	eventstepinstance.id, eventstepinstance.status, eventstepinstance.order, eventstepinstance.eventgroupinstance_id,
		eventstepinstance.operator_id, eventstepinstance.operation_id, eventstepinstance.continue_on_error,
		eventstepinstance.end_timestamp,
    	eventstep.depends_on "eventstep.depends_on",
    	eventstep.name "eventstep.name"
		FROM eventstepinstance 
		JOIN eventstep on eventstepinstance.eventstep_id = eventstep.id
		WHERE eventstepinstance.eventgroupinstance_id=$1`,
		eventgroupInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to fetch event steps")
		_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2, current_order_step=$3
		WHERE id=$4`, eventing.EventGroupInstanceStatusError, time.Now().UTC(), 0, eventgroupInstanceID)
		return err
	}
	eventGroupInstance := databaseStructs.EventGroupInstance{}
	err = database.DB.Get(&eventGroupInstance, `SELECT * FROM eventgroupinstance WHERE id=$1`, eventgroupInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to fetch event group")
		_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2, current_order_step=$3
		WHERE id=$4`, eventing.EventGroupInstanceStatusError, time.Now().UTC(), 0, eventgroupInstanceID)
		return err
	}
	err = findNextStepToStartAndStartIt(eventSteps, eventGroupInstance)
	if err != nil {
		_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2
		WHERE id=$3`, eventing.EventGroupInstanceStatusError, time.Now().UTC(), eventgroupInstanceID)
		return err
	}
	return nil
}
func restartFromStepJobs(eventStepInstanceID int, retryAllEventGroups bool) error {
	triggerStep := databaseStructs.EventStepInstance{}
	err := database.DB.Get(&triggerStep, `SELECT
    	eventstepinstance.id, eventstepinstance.order, eventstepinstance.eventgroupinstance_id,
    	eventstep.name "eventstep.name",
    	eventgroupinstance.eventgroup_id "eventgroupinstance.eventgroup_id"
    	FROM eventstepinstance
    	JOIN eventgroupinstance ON eventstepinstance.eventgroupinstance_id = eventgroupinstance.id
    	JOIN eventstep ON eventstepinstance.eventstep_id = eventstep.id
    	WHERE eventstepinstance.id=$1`, eventStepInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to fetch event groups")
		return err
	}
	eventGroupInstances := []databaseStructs.EventGroupInstance{}
	err = database.DB.Select(&eventGroupInstances, `SELECT 
    	eventgroupinstance.id, eventgroupinstance.status
		FROM eventgroupinstance 
		JOIN eventgroup ON eventgroupinstance.eventgroup_id = eventgroup.id
		WHERE eventgroup.id=$1 AND eventgroup.deleted=false AND eventgroup.active=true`, triggerStep.EventGroupInstance.EventGroupID)
	if err != nil {
		logging.LogError(err, "Failed to fetch event groups")
		return err
	}
	for i, _ := range eventGroupInstances {
		// want to retrigger if we're looking at the group where our step was selected OR
		// we want to retry all similar group instances where the status is cancelled or error
		if (retryAllEventGroups && (eventGroupInstances[i].Status == eventing.EventGroupInstanceStatusCancelled ||
			eventGroupInstances[i].Status == eventing.EventGroupInstanceStatusError)) ||
			eventGroupInstances[i].ID == triggerStep.EventGroupInstanceID {

			_, err = database.DB.Exec(`UPDATE eventstepinstance
				SET status=$1, end_timestamp=$2 
				FROM eventstep
				WHERE eventstepinstance.eventstep_id = eventstep.id AND 
				      eventgroupinstance_id=$3 AND (eventstep.name=$4 OR eventstepinstance.order > $5)`,
				eventing.EventGroupInstanceStatusQueued, nil, eventGroupInstances[i].ID,
				triggerStep.EventStep.Name, triggerStep.Order)
			if err != nil {
				logging.LogError(err, "Failed to update event steps")
				return err
			}
			_, err = database.DB.Exec(`UPDATE eventgroupinstance 
				SET status=$1, end_timestamp=$2, current_order_step=$3
				WHERE id=$4`, eventing.EventGroupInstanceStatusRunning, nil, 0, eventGroupInstances[i].ID)
			if err != nil {
				logging.LogError(err, "Failed to update event steps")
				return err
			}
			eventSteps := []databaseStructs.EventStepInstance{}
			err = database.DB.Select(&eventSteps, `SELECT 
				eventstepinstance.id, eventstepinstance.status, eventstepinstance.order, eventstepinstance.eventgroupinstance_id,
				eventstepinstance.operator_id, eventstepinstance.operation_id, eventstepinstance.continue_on_error,
				eventstepinstance.end_timestamp,
				eventstep.depends_on "eventstep.depends_on",
				eventstep.name "eventstep.name"
				FROM eventstepinstance 
				JOIN eventstep on eventstepinstance.eventstep_id = eventstep.id
				WHERE eventstepinstance.eventgroupinstance_id=$1`,
				eventGroupInstances[i].ID)
			if err != nil {
				logging.LogError(err, "Failed to fetch event steps")
				_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2, current_order_step=$3
					WHERE id=$4`,
					eventing.EventGroupInstanceStatusError, time.Now().UTC(), 0, eventGroupInstances[i].ID)
				return err
			}
			eventGroupInstance := databaseStructs.EventGroupInstance{}
			err = database.DB.Get(&eventGroupInstance, `SELECT * FROM eventgroupinstance WHERE id=$1`,
				eventGroupInstances[i].ID)
			if err != nil {
				logging.LogError(err, "Failed to fetch event group")
				_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2, current_order_step=$3
				WHERE id=$4`, eventing.EventGroupInstanceStatusError, time.Now().UTC(), 0, eventGroupInstances[i].ID)
				return err
			}
			err = findNextStepToStartAndStartIt(eventSteps, eventGroupInstance)
			if err != nil {
				_, _ = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1, end_timestamp=$2
				WHERE id=$3`, eventing.EventGroupInstanceStatusError, time.Now().UTC(), eventGroupInstances[i].ID)
				return err
			}
		}
	}

	return nil
}

// markStepInstanceAsError if ContinueOnError then processEventFinishAndNextStepStart
// otherwise error the group and cancel all queued steps
func markStepInstanceAsError(eventStepInstance databaseStructs.EventStepInstance, errString string) {
	eventStepInstance.Status = eventing.EventGroupInstanceStatusError
	eventStepInstance.EndTimestamp.Valid = true
	eventStepInstance.EndTimestamp.Time = time.Now().UTC()
	eventStepInstance.Stderr = errString
	_, err := database.DB.NamedExec(`UPDATE eventstepinstance SET
                             status=:status, end_timestamp=:end_timestamp, stderr=:stderr
                             WHERE id=:id`, eventStepInstance)
	if err != nil {
		logging.LogError(err, "Failed to update eventstep instance error status")
	}
	_, err = database.DB.Exec(`UPDATE apitokens SET deleted=true, active=false 
                 WHERE eventstepinstance_id=$1`, eventStepInstance.ID)
	if err != nil {
		logging.LogError(err, "Failed to mark apitoken as deleted")
	}
	if eventStepInstance.ContinueOnError {
		processEventFinishAndNextStepStart(EventNotification{
			EventStepInstanceID: eventStepInstance.ID,
		})
		return
	}
	_, err = database.DB.Exec(`UPDATE eventgroupinstance SET
                              status=$1, end_timestamp=$2
                              WHERE id=$3`,
		eventing.EventGroupInstanceStatusError, time.Now().UTC(),
		eventStepInstance.EventGroupInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to update eventgroup instance error status")
	}
	err = cancelQueuedEventStepInstances(eventStepInstance.EventGroupInstanceID)
	if err != nil {
		logging.LogError(err, "Failed to cancel other queued event steps")
	}
}

// cancelQueuedEventStepInstances updates all queued remaining steps to canceled step
func cancelQueuedEventStepInstances(eventGroupInstanceID int) error {
	_, err := database.DB.Exec(`UPDATE eventstepinstance 
		SET status=$1, end_timestamp=$2
		WHERE eventgroupinstance_id=$3 AND status=$4`,
		eventing.EventGroupInstanceStatusCancelled, time.Now().UTC(),
		eventGroupInstanceID, eventing.EventGroupInstanceStatusQueued)
	return err
}
