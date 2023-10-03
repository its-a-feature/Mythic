package rabbitmq

import (
	"encoding/json"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCPayloadUpdateBuildStepMessage struct {
	PayloadUUID string `json:"payload_uuid"`
	StepName    string `json:"step_name"`
	StepStdout  string `json:"step_stdout"`
	StepStderr  string `json:"step_stderr"`
	StepSuccess bool   `json:"step_success"`
	StepSkip    bool   `json:"step_skip"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCPayloadUpdateBuildStepMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PAYLOAD_UPDATE_BUILD_STEP,   // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_PAYLOAD_UPDATE_BUILD_STEP,   // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCPayloadUpdateBuildStep, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCPayloadUpdateBuildStep(input MythicRPCPayloadUpdateBuildStepMessage) MythicRPCPayloadUpdateBuildStepMessageResponse {
	response := MythicRPCPayloadUpdateBuildStepMessageResponse{
		Success: false,
	}
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT
	id
	FROM payload
	WHERE uuid=$1`, input.PayloadUUID); err != nil {
		logging.LogError(err, "Failed to find payload")
		response.Error = err.Error()
		return response
	} else {
		// we need to set the endtime for the specified step to now() and also the start time for the next step to now()
		stepNow := time.Now().UTC()
		allBuildSteps := []databaseStructs.PayloadBuildStep{}
		if err := database.DB.Select(&allBuildSteps, `SELECT
			id, step_number, step_name, start_time, end_time
			FROM payload_build_step
			WHERE payload_id=$1 ORDER BY step_number ASC`, payload.ID); err != nil {
			logging.LogError(err, "Failed to fetch current build steps for payload")
		} else {
			setStartTimeOfNextStep := false
			var prevSteps []databaseStructs.PayloadBuildStep
			for _, step := range allBuildSteps {
				if setStartTimeOfNextStep {
					if !step.StartTime.Valid {
						setStartTimeOfNextStep = false
						step.StartTime.Time = stepNow
						step.StartTime.Valid = true
						if _, err := database.DB.NamedExec(`UPDATE payload_build_step SET
							start_time=:start_time
							WHERE id=:id`, step); err != nil {
							logging.LogError(err, "Failed to update payload build step")
							response.Error = err.Error()
							return response
						} else {
							// break out early here so that we don't keep adding steps as "previous"
							break
						}
					}
				}
				if step.StepName == input.StepName {
					setStartTimeOfNextStep = true
					step.StepStdout = input.StepStdout
					step.StepStderr = input.StepStderr
					step.Success = input.StepSuccess
					step.StepSkip = input.StepSkip
					step.EndTime.Valid = true
					step.EndTime.Time = stepNow
					if !step.StartTime.Valid {
						step.StartTime.Valid = true
						step.StartTime.Time = stepNow
					}
					if _, err := database.DB.NamedExec(`UPDATE payload_build_step SET
						step_stdout=:step_stdout, step_stderr=:step_stderr, 
						step_success=:step_success, end_time=:end_time, start_time=:start_time, step_skip=:step_skip
						WHERE id=:id`, step); err != nil {
						logging.LogError(err, "Failed to update payload build step")
						response.Error = err.Error()
						return response
					}
				}
				if !step.EndTime.Valid {
					prevSteps = append(prevSteps, step)
				}

			}
			for _, step := range prevSteps {
				// loop through all the steps that weren't marked as done before this one and update them
				if !step.StartTime.Valid {
					step.StartTime.Valid = true
					step.StartTime.Time = stepNow
				}
				if !step.EndTime.Valid {
					step.EndTime.Valid = true
					step.EndTime.Time = stepNow
				}
				step.StepSkip = input.StepSkip
				step.Success = input.StepSuccess
				step.StepStdout = step.StepStdout + "\nAutomatically marked as done due to future step completing"
				if _, err := database.DB.NamedExec(`UPDATE payload_build_step SET
						step_stdout=:step_stdout, step_success=:step_success, end_time=:end_time, start_time=:start_time,
						step_skip=:step_skip
						WHERE id=:id`, step); err != nil {
					logging.LogError(err, "Failed to update payload build step")
					response.Error = err.Error()
					return response
				}
			}

		}

	}
	return response
}
func processMythicRPCPayloadUpdateBuildStep(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCPayloadUpdateBuildStepMessage{}
	responseMsg := MythicRPCPayloadUpdateBuildStepMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCPayloadUpdateBuildStep(incomingMessage)
	}
	return responseMsg
}
