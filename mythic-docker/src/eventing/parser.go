package eventing

import (
	"encoding/json"
	"errors"
	"fmt"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/pelletier/go-toml/v2"
	"golang.org/x/exp/slices"
	"gopkg.in/yaml.v3"
)

var (
	ActionPayloadCreate     = "payload_create"
	ActionCreateCallback    = "callback_create"
	ActionCreateTask        = "task_create"
	ActionCustomFunction    = "custom_function"
	ActionConditionalCheck  = "conditional_check"
	ActionInterceptTask     = "task_intercept"
	ActionInterceptResponse = "response_intercept"
	ActionCreateAlert       = "alert_create"
	ActionSendWebhook       = "webhook_send"
)

// valid actions to do when starting a new step
var ValidActions = []string{
	ActionPayloadCreate,
	ActionCreateCallback,
	ActionCreateTask,
	ActionCustomFunction,
	ActionConditionalCheck,
	ActionInterceptTask,
	ActionInterceptResponse,
	ActionCreateAlert,
	ActionSendWebhook,
}
var (
	TriggerManual                    = "manual"
	TriggerKeyword                   = "keyword"
	TriggerCancel                    = "cancel"
	TriggerRetry                     = "retry"
	TriggerRetryFromStep             = "retry_from_step"
	TriggerRunAgain                  = "run_again"
	TriggerCron                      = "cron"
	TriggerMythicStart               = "mythic_start"
	TriggerPayloadBuildStart         = "payload_build_start"
	TriggerPayloadBuildFinish        = "payload_build_finish"
	TriggerTaskCreate                = "task_create"
	TriggerTaskStart                 = "task_start"
	TriggerTaskFinish                = "task_finish"
	TriggerUserOutput                = "user_output"
	TriggerFileDownload              = "file_download"
	TriggerFileUpload                = "file_upload"
	TriggerScreenshot                = "screenshot"
	TriggerAlert                     = "alert"
	TriggerCallbackNew               = "callback_new"
	TriggerCustomFunctionResponse    = "custom_function_response"
	TriggerConditionalCheckResponse  = "conditional_check_response"
	TriggerTaskIntercept             = "task_intercept"
	TriggerTaskInterceptResponse     = "task_intercept_response"
	TriggerResponseIntercept         = "response_intercept"
	TriggerResponseInterceptResponse = "response_intercept_response"
	TriggerCallbackCheckin           = "callback_checkin"
	TriggerTagCreate                 = "tag_create"
)

// when to trigger a new workflow
var ValidTriggers = []string{
	TriggerManual,
	TriggerKeyword,
	TriggerMythicStart,
	TriggerCron,
	TriggerPayloadBuildStart,
	TriggerPayloadBuildFinish,
	TriggerTaskCreate,
	TriggerTaskStart,
	TriggerTaskFinish,
	TriggerUserOutput,
	TriggerFileDownload,
	TriggerFileUpload,
	TriggerScreenshot,
	TriggerAlert,
	TriggerCallbackNew,
	TriggerTaskIntercept,
	TriggerResponseIntercept,
	TriggerCallbackCheckin,
	TriggerTagCreate,
}
var (
	RunAsEventGroupCreator = "self"
	RunAsEventGroupTrigger = "trigger"
	RunAsOperationAdmin    = "lead"
	RunAsOperationBot      = "bot"
)

func GetMythicJSONTextFromStruct(input interface{}) databaseStructs.MythicJSONText {
	newType := databaseStructs.MythicJSONText{}
	if err := newType.Scan(input); err != nil {
		logging.LogError(err, "Failed to marshal struct into databaseStructs.MythicJSONText")
	}
	return newType
}
func GetMythicJSONArrayFromStruct(input interface{}) databaseStructs.MythicJSONArray {
	newType := databaseStructs.MythicJSONArray{}
	if err := newType.Scan(input); err != nil {
		logging.LogError(err, "Failed to marshal struct into databaseStructs.MythicJSONArray")
	}
	return newType
}
func Ingest(fileContents []byte) (databaseStructs.EventGroup, error) {
	eventGroup := EventGroup{}
	databaseEventGroup := databaseStructs.EventGroup{}
	err := yaml.Unmarshal(fileContents, &eventGroup)
	if err != nil {
		logging.LogError(err, "failed to parse yaml")
		err = toml.Unmarshal(fileContents, &eventGroup)
		if err != nil {
			logging.LogError(err, "failed to parse toml")
			err = json.Unmarshal(fileContents, &eventGroup)
			if err != nil {
				logging.LogError(err, "failed to parse json")
			}
			return databaseEventGroup, err
		}
	}
	if eventGroup.Name == "" {
		return databaseEventGroup, errors.New("no event name supplied")
	}
	databaseEventGroup.Name = eventGroup.Name
	databaseEventGroup.TriggerData = GetMythicJSONTextFromStruct(eventGroup.TriggerData)
	databaseEventGroup.Trigger = eventGroup.Trigger
	databaseEventGroup.Description = eventGroup.Description
	databaseEventGroup.Environment = GetMythicJSONTextFromStruct(eventGroup.Environment)
	databaseEventGroup.Keywords = GetMythicJSONArrayFromStruct(eventGroup.Keywords)
	databaseEventGroup.RunAs = eventGroup.RunAs
	if databaseEventGroup.RunAs == "" {
		databaseEventGroup.RunAs = RunAsOperationBot
	}
	for i, _ := range eventGroup.Steps {
		databaseEventStep := databaseStructs.EventStep{}
		if eventGroup.Steps[i].Name == "" {
			return databaseEventGroup, errors.New("no step name supplied")
		}
		databaseEventStep.Name = eventGroup.Steps[i].Name
		databaseEventStep.Description = eventGroup.Steps[i].Description
		databaseEventStep.Environment = GetMythicJSONTextFromStruct(eventGroup.Steps[i].Environment)
		databaseEventStep.Action = eventGroup.Steps[i].Action
		databaseEventStep.DependsOn = GetMythicJSONArrayFromStruct(eventGroup.Steps[i].DependsOn)
		databaseEventStep.ActionData = GetMythicJSONTextFromStruct(eventGroup.Steps[i].ActionData)
		databaseEventStep.Inputs = GetMythicJSONTextFromStruct(eventGroup.Steps[i].Inputs)
		databaseEventStep.Outputs = GetMythicJSONTextFromStruct(eventGroup.Steps[i].Outputs)
		databaseEventStep.ContinueOnError = eventGroup.Steps[i].ContinueOnError
		databaseEventGroup.Steps = append(databaseEventGroup.Steps, databaseEventStep)
	}
	return databaseEventGroup, nil
}
func EnsureTrigger(eventGroup *databaseStructs.EventGroup, alsoCheckSteps bool) error {
	if !slices.Contains(ValidTriggers, eventGroup.Trigger) {
		return errors.New(fmt.Sprintf("Invalid trigger: %s", eventGroup.Trigger))
	}
	if !alsoCheckSteps {
		return nil
	}
	if eventGroup.Trigger == TriggerTaskIntercept {
		foundTaskInterceptAction := false
		for i, _ := range eventGroup.Steps {
			if eventGroup.Steps[i].Action == TriggerTaskIntercept {
				if !foundTaskInterceptAction {
					foundTaskInterceptAction = true
				} else {
					return errors.New("more than one task_intercept step isn't allowed")
				}
			}
		}
		if !foundTaskInterceptAction {
			return errors.New("task_intercept trigger needs one task_intercept step action")
		}
	}
	if eventGroup.Trigger == TriggerResponseIntercept {
		foundResponseInterceptAction := false
		for i, _ := range eventGroup.Steps {
			if eventGroup.Steps[i].Action == TriggerResponseIntercept {
				if !foundResponseInterceptAction {
					foundResponseInterceptAction = true
				} else {
					return errors.New("more than one response_intercept step isn't allowed")
				}
			}
		}
		if !foundResponseInterceptAction {
			return errors.New("response_intercept trigger needs one response_intercept step action")
		}
	}
	return nil
}
func ResolveDependencies(eventGroup *databaseStructs.EventGroup) error {
	steps := make(map[string]*databaseStructs.EventStep)
	// track all the steps and check for duplicates
	for stepIndex, _ := range eventGroup.Steps {
		if _, ok := steps[eventGroup.Steps[stepIndex].Name]; ok {
			return errors.New(fmt.Sprintf("Duplicated step name detected: %s", eventGroup.Steps[stepIndex].Name))
		}
		if len(eventGroup.Steps[stepIndex].DependsOn.StructStringValue()) == 0 {
			eventGroup.Steps[stepIndex].Order = 0
		}
		steps[eventGroup.Steps[stepIndex].Name] = &eventGroup.Steps[stepIndex]
	}
	// check for cyclic dependencies
	for stepKey, _ := range steps {
		visitedSteps := make(map[string]bool)
		visitedSteps[stepKey] = true
		stepOrder := 0
		stepsToProcess := steps[stepKey].DependsOn.StructStringValue()
		if len(stepsToProcess) > 0 {
			stepOrder += 1
		}
		//fmt.Printf("processing step: %s\n", stepKey)
		for i := 0; i < len(stepsToProcess); i++ {
			//fmt.Printf("Steps to process: %v\n", stepsToProcess)
			if _, ok := steps[stepsToProcess[i]]; !ok {
				return errors.New(fmt.Sprintf("Unknown dependency discovered! %s depends on %s, but it isn't a step", stepKey, stepsToProcess[i]))
			}
			if _, ok := visitedSteps[stepsToProcess[i]]; ok {
				return errors.New(fmt.Sprintf("Cyclic dependency discovered! %s results in duplicated dependency %s", stepKey, stepsToProcess[i]))
			}
			if len(steps[stepsToProcess[i]].DependsOn.StructStringValue()) > 0 {
				//fmt.Printf("%s depends on %v, adding them\n", stepKey, steps[stepsToProcess[i]].DependsOn.StructStringValue())
				// we haven't seen this step before, so add all of that steps dependencies to the list
				stepsToProcess = append(stepsToProcess, steps[stepsToProcess[i]].DependsOn.StructStringValue()...)
				stepOrder += 1
			}
		}
		steps[stepKey].Order = stepOrder
	}
	return nil
}
func EnsureActions(eventGroup *databaseStructs.EventGroup) error {
	for i, _ := range eventGroup.Steps {
		if !slices.Contains(ValidActions, eventGroup.Steps[i].Action) {
			return errors.New(fmt.Sprintf("Unknown action, %s, in step %s", eventGroup.Steps[i].Action, eventGroup.Steps[i].Name))
		}
	}
	if len(eventGroup.Steps) == 0 {
		return errors.New(fmt.Sprintf("No steps detected for event group"))
	}
	return nil
}
func EnsureActionDataForAction(eventGroup *databaseStructs.EventGroup) error {
	for i, _ := range eventGroup.Steps {
		switch eventGroup.Steps[i].Action {
		case ActionPayloadCreate:
		case ActionCreateTask:
		case ActionInterceptResponse:
		case ActionInterceptTask:
		case ActionConditionalCheck:
		case ActionCustomFunction:
		case ActionCreateCallback:
		case ActionCreateAlert:
		case ActionSendWebhook:
		}
	}
	if len(eventGroup.Steps) == 0 {
		return errors.New(fmt.Sprintf("No steps detected for event group"))
	}
	return nil
}
