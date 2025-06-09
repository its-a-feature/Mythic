package rabbitmq

import (
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/eventing"
	"time"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

func RegisterNewPayload(payloadDefinition PayloadConfiguration, operatorOperation *databaseStructs.Operatoroperation) (string, int, error) {
	logging.LogDebug("registering new payload", "payloadDefinition", payloadDefinition)
	payloadtype := databaseStructs.Payloadtype{}
	var err error
	err = database.DB.Get(&payloadtype, `SELECT 
		payloadtype.id, payloadtype."name", "wrapper", supported_os, supports_dynamic_loading, translation_container_id, mythic_encrypts
		FROM payloadtype 
		WHERE payloadtype."name"=$1`, payloadDefinition.PayloadType)
	if err != nil {
		logging.LogError(err, "Failed to find payload type to create payload")
		return "", 0, errors.New("Failed to find payload type")
	}
	if payloadtype.TranslationContainerID.Valid {
		err = database.DB.Get(&payloadtype.Translationcontainer, `SELECT
			"name" 
			FROM
			translationcontainer WHERE id=$1`, payloadtype.TranslationContainerID.Int64)
		if err != nil {
			logging.LogError(err, "Failed to fetch translation container information")
		}
	}
	//logging.LogDebug("fetched payloadtype info", "info", payloadtype)
	wrappedPayload := databaseStructs.Payload{}
	if !payloadtype.Wrapper && payloadDefinition.C2Profiles == nil {
		err := errors.New("Missing C2 profile information")
		logging.LogError(err, "Failed to build new payload")
		return "", 0, err
	}
	if payloadtype.Wrapper && payloadDefinition.WrappedPayloadUUID == "" {
		err := errors.New("Missing wrapped_payload UUID")
		logging.LogError(err, "Failed to build new payload")
		return "", 0, err
	}
	if payloadtype.Wrapper {
		// get the wrapped payload
		err = database.DB.Get(&wrappedPayload, "SELECT id FROM payload WHERE uuid=$1", payloadDefinition.WrappedPayloadUUID)
		if err != nil {
			logging.LogError(err, "Failed to find wrapped payload to create payload")
			return "", 0, errors.New("Failed to find wrapped payload")
		}
	}
	stringSupportedOS := payloadtype.SupportedOs.StructStringValue()
	if !utils.SliceContains(stringSupportedOS, payloadDefinition.SelectedOS) {
		err := errors.New("Selected OS not supported by payload type")
		logging.LogError(err, "Failed to build new payload", "supported_os", payloadtype.SupportedOs, "selected_os", payloadDefinition.SelectedOS)
		return "", 0, err
	}
	if payloadDefinition.Description == "" {
		if operatorOperation.CurrentOperator.Username == "" {
			payloadDefinition.Description = "Created automatically at " + time.Now().UTC().Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
		} else {
			payloadDefinition.Description = "Created by " + operatorOperation.CurrentOperator.Username + " at " + time.Now().UTC().Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
		}

	}
	if payloadDefinition.UUID == "" {
		payloadDefinition.UUID = uuid.New().String()
	}
	// create the base file information in the database for the new payload
	fileMeta := databaseStructs.Filemeta{
		AgentFileID:         uuid.New().String(),
		OperationID:         operatorOperation.CurrentOperation.ID,
		TotalChunks:         1,
		IsPayload:           true,
		IsScreenshot:        false,
		IsDownloadFromAgent: false,
		Complete:            true,
		ChunksReceived:      1,
		DeleteAfterFetch:    false,
		ChunkSize:           0,
	}
	fileMeta.AgentFileID, fileMeta.Path, err = GetSaveFilePath()
	if err != nil {
		logging.LogError(err, "Failed to create save file on disk")
		return "", 0, err
	}
	fileMeta.OperatorID = operatorOperation.CurrentOperator.ID
	fileMeta.Filename = []byte(payloadDefinition.Filename)
	fileMeta.FullRemotePath = make([]byte, 0)
	statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
		(agent_file_id, operation_id,operator_id,total_chunks,is_payload,is_screenshot,is_download_from_agent,complete,chunks_received,delete_after_fetch,filename,path, chunk_size, full_remote_path) 
		VALUES (:agent_file_id, :operation_id,:operator_id,:total_chunks,:is_payload,:is_screenshot,:is_download_from_agent,:complete,:chunks_received,:delete_after_fetch,:filename,:path,:chunk_size, :full_remote_path) 
		RETURNING id`,
	)
	if err != nil {
		logging.LogError(err, "Failed to create new filemeta statement for creating payload")
		return "", 0, err
	}
	err = statement.Get(&fileMeta.ID, fileMeta)
	if err != nil {
		logging.LogError(err, "Failed to create new filemeta object for creating payload")
		return "", 0, err
	}
	databasePayload := databaseStructs.Payload{
		OperatorID:     operatorOperation.CurrentOperator.ID,
		PayloadTypeID:  payloadtype.ID,
		Description:    payloadDefinition.Description,
		UuID:           payloadDefinition.UUID,
		OperationID:    operatorOperation.CurrentOperation.ID,
		Os:             payloadDefinition.SelectedOS,
		Payloadtype:    payloadtype,
		BuildContainer: "rabbitmq",
	}
	databasePayload.FileID.Valid = true
	databasePayload.FileID.Int64 = int64(fileMeta.ID)
	if payloadtype.Wrapper {
		// this is a payload wrapper, so we need to find the wrapped payload as well and associate them
		databasePayload.WrappedPayloadID.Valid = true
		databasePayload.WrappedPayloadID.Int64 = int64(wrappedPayload.ID)
	}
	if payloadDefinition.EventStepInstance > 0 {
		databasePayload.EventStepInstanceID.Valid = true
		databasePayload.EventStepInstanceID.Int64 = int64(payloadDefinition.EventStepInstance)
	}
	statement, err = database.DB.PrepareNamed(`INSERT INTO payload 
		(operator_id, payload_type_id, description, uuid, operation_id, os, file_id, wrapped_payload_id, build_container, eventstepinstance_id) 
		VALUES (:operator_id, :payload_type_id, :description, :uuid, :operation_id, :os, :file_id, :wrapped_payload_id, :build_container, :eventstepinstance_id) 
		RETURNING id`,
	)
	if err != nil {
		logging.LogError(err, "Failed to create new payload statement for creating payload")
		return "", 0, err
	}
	err = statement.Get(&databasePayload.ID, databasePayload)
	if err != nil {
		logging.LogError(err, "Failed to create new payload object for creating payload")
		return "", 0, err
	}
	go func() {
		// now that we have a payload, we need to handle adding build parameters
		buildParameters, err := associateBuildParametersWithPayload(databasePayload, payloadDefinition.BuildParameters)
		if err != nil {
			logging.LogError(err, "Failed to associate build parameters with new payload")
			database.UpdatePayloadWithError(databasePayload, err)
			return
		}
		// if this isn't a wrapper payload, we need to handle c2 profiles and commands
		if !payloadtype.Wrapper {
			c2Profiles, err := associateC2ProfilesWithPayload(databasePayload, payloadDefinition.C2Profiles)
			if err != nil {
				logging.LogError(err, "Failed to associated C2 Profiles with Payload", "c2_profiles", payloadDefinition.C2Profiles)
				database.UpdatePayloadWithError(databasePayload, err)
				return
			}
			buildCommands, err := associateCommandsWithPayload(databasePayload, payloadDefinition.Commands, payloadDefinition.CommandGroups, buildParameters)
			if err != nil {
				logging.LogError(err, "Failed to associate commands with Payload", "commands", payloadDefinition.Commands)
				database.UpdatePayloadWithError(databasePayload, err)
				return
			}
			// we've successfully registered the payload, c2 profiles, and commands in the database
			// now to send all of it over to the container for building
			rabbitmqPayloadBuildMsg := PayloadBuildMessage{
				PayloadType:     payloadtype.Name,
				CommandList:     buildCommands,
				BuildParameters: buildParameters,
				C2Profiles:      c2Profiles,
				SelectedOS:      databasePayload.Os,
				PayloadUUID:     databasePayload.UuID,
				OperationID:     operatorOperation.CurrentOperation.ID,
				OperatorID:      operatorOperation.CurrentOperator.ID,
				PayloadFileUUID: fileMeta.AgentFileID,
				Filename:        payloadDefinition.Filename,
				Secrets:         GetSecrets(operatorOperation.CurrentOperator.ID, payloadDefinition.EventStepInstance),
			}
			SendPayloadBuildMessage(databasePayload, rabbitmqPayloadBuildMsg)
			EventingChannel <- EventNotification{
				Trigger:             eventing.TriggerPayloadBuildStart,
				PayloadID:           databasePayload.ID,
				EventStepInstanceID: payloadDefinition.EventStepInstance,
				OperationID:         operatorOperation.CurrentOperation.ID,
				OperatorID:          operatorOperation.CurrentOperator.ID,
			}
			return
		}
		// now that we have the databasePayload.WrappedPayloadID value
		// we need to get the corresponding file path and read the contents of the file
		err = database.DB.Get(&wrappedPayload, `SELECT
			payload.id, payload.uuid,
			filemeta.path "filemeta.path"
			FROM payload
			JOIN filemeta on payload.file_id = filemeta.id
			WHERE payload.id=$1 AND payload.deleted=false`, databasePayload.WrappedPayloadID)
		if err != nil {
			logging.LogError(err, "Failed to get information about wrapped payload")
			database.UpdatePayloadWithError(databasePayload, err)
			return
		}
		// to pass along as part of the wrapper build process
		rabbitmqPayloadBuildMsg := PayloadBuildMessage{
			PayloadType:        payloadtype.Name,
			WrappedPayloadUUID: &wrappedPayload.UuID,
			BuildParameters:    buildParameters,
			SelectedOS:         databasePayload.Os,
			PayloadUUID:        databasePayload.UuID,
			OperationID:        operatorOperation.CurrentOperation.ID,
			OperatorID:         operatorOperation.CurrentOperator.ID,
			PayloadFileUUID:    fileMeta.AgentFileID,
			Filename:           string(fileMeta.Filename),
			Secrets:            GetSecrets(operatorOperation.CurrentOperator.ID, payloadDefinition.EventStepInstance),
		}
		go SendPayloadBuildMessage(databasePayload, rabbitmqPayloadBuildMsg)
		EventingChannel <- EventNotification{
			Trigger:             eventing.TriggerPayloadBuildStart,
			PayloadID:           databasePayload.ID,
			EventStepInstanceID: payloadDefinition.EventStepInstance,
			OperationID:         operatorOperation.CurrentOperation.ID,
			OperatorID:          operatorOperation.CurrentOperator.ID,
		}
		return
	}()
	return databasePayload.UuID, databasePayload.ID, nil
}

func registerPayloadBuildSteps(databasePayload databaseStructs.Payload) error {
	baseSteps := []databaseStructs.PayloadBuildStep{}
	if err := database.DB.Select(&baseSteps, `SELECT
	* 
	FROM payload_build_step
	WHERE payload_id IS NULL and payloadtype_id=$1 ORDER BY step_number ASC`, databasePayload.PayloadTypeID); err != nil {
		logging.LogError(err, "Failed to fetch current build steps for payload type")
		return err
	} else {
		for indx, step := range baseSteps {
			step.PayloadID.Int64 = int64(databasePayload.ID)
			step.PayloadID.Valid = true
			if indx == 0 {
				step.StartTime.Time = time.Now().UTC()
				step.StartTime.Valid = true
			} else {
				step.StartTime.Valid = false
			}

			if _, err := database.DB.NamedExec(`INSERT INTO payload_build_step
			(payload_id, step_number, step_name, step_description, start_time)
			VALUES (:payload_id, :step_number, :step_name, :step_description, :start_time)`, step); err != nil {
				logging.LogError(err, "Failed to create a new build step when generating payload")
				return err
			}
		}
		return nil
	}
}

// send the initial build message out to the container if other checks pass
func SendPayloadBuildMessage(databasePayload databaseStructs.Payload, buildMessage PayloadBuildMessage) {
	// call this function when you're ready to send a build message to the payload container
	// this will trigger a c2 opsec check for each c2 included
	buildOutput := ""
	checksPassed := true
	if err := registerPayloadBuildSteps(databasePayload); err != nil {
		database.UpdatePayloadWithError(databasePayload, err)
	}
	for _, c2 := range buildMessage.C2Profiles {
		totalSteps := 3
		if c2.IsP2P {
			totalSteps = 2
		}
		buildOutput += fmt.Sprintf("Processing C2 Profile - %s:\n", c2.Name)
		buildOutput += fmt.Sprintf("Step 1/%d - Issuing OPSEC Check\n", totalSteps)
		if opsecCheckResponse, err := RabbitMQConnection.SendC2RPCOpsecCheck(C2OPSECMessage{
			Name:       c2.Name,
			Parameters: c2.Parameters,
		}); err != nil {
			//checksPassed = false
			buildOutput += err.Error() + "\n"
		} else if !opsecCheckResponse.Success {
			checksPassed = false
			buildOutput += "[-] !!! C2 OPSEC check failed !!! \n" + opsecCheckResponse.Error
		} else {
			buildOutput += opsecCheckResponse.Message + "\n"
		}
		buildOutput += fmt.Sprintf("Step 2/%d - Issuing Config Check\n", totalSteps)
		if configCheckResponse, err := RabbitMQConnection.SendC2RPCConfigCheck(C2ConfigCheckMessage{
			Name:       c2.Name,
			Parameters: c2.Parameters,
		}); err != nil {
			//checksPassed = false
			buildOutput += err.Error() + "\n"
		} else if !configCheckResponse.Success {
			checksPassed = false
			buildOutput += "[-] !!! C2 Configuration check failed !!! \n" + configCheckResponse.Error + "\n"
		} else {
			buildOutput += configCheckResponse.Message + "\n"
		}
		if !c2.IsP2P {
			buildOutput += fmt.Sprintf("Step 3/%d - Issuing Start command\n", totalSteps)
			c2StartServerResponse := autoStartC2Profile(databaseStructs.C2profile{Name: c2.Name, ID: c2.ID})
			if !c2StartServerResponse.Success {
				buildOutput += c2StartServerResponse.Error + "\n"
			} else {
				buildOutput += c2StartServerResponse.Message + "\n"
			}
		}
	}
	if !checksPassed {
		// one or more opsec checks failed, we need to bail out of building the payload
		logging.LogError(nil, "One or more c2 profiles errored out for an opsec check")
		SendAllOperationsMessage(fmt.Sprintf("C2 Profile aborted build process due to OPSEC or Configuration error"), databasePayload.OperationID,
			"mythic_payload_build", database.MESSAGE_LEVEL_WARNING)
		database.UpdatePayloadWithError(databasePayload, errors.New(buildOutput))
		EventingChannel <- EventNotification{
			Trigger:             eventing.TriggerPayloadBuildFinish,
			EventStepInstanceID: int(databasePayload.EventStepInstanceID.Int64),
			PayloadID:           databasePayload.ID,
			OperationID:         databasePayload.OperationID,
			OperatorID:          databasePayload.OperatorID,
			ActionSuccess:       false,
			ActionStdout:        databasePayload.BuildStdout,
			ActionStderr:        databasePayload.BuildStderr,
		}
		return
	}
	logging.LogDebug("Sending build message to container", "payload", buildMessage.PayloadType)
	err := RabbitMQConnection.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtBuildRoutingKey(buildMessage.PayloadType),
		"",
		buildMessage,
		false,
	)
	if err != nil {
		logging.LogError(err, "Failed to send build message")
		buildOutput += fmt.Sprintf("\nSending Build command\n")
		buildOutput += err.Error()
		database.UpdatePayloadWithError(databasePayload, errors.New(buildOutput))
		EventingChannel <- EventNotification{
			Trigger:             eventing.TriggerPayloadBuildFinish,
			EventStepInstanceID: int(databasePayload.EventStepInstanceID.Int64),
			PayloadID:           databasePayload.ID,
			OperationID:         databasePayload.OperationID,
			OperatorID:          databasePayload.OperatorID,
			ActionSuccess:       false,
			ActionStdout:        databasePayload.BuildStdout,
			ActionStderr:        databasePayload.BuildStderr,
		}
		return
	}
	buildOutput += fmt.Sprintf("\nSending Build command\n")
	databasePayload.BuildMessage += buildOutput
	_, updateError := database.DB.NamedExec(`UPDATE payload SET 
			build_message=:build_message 
			WHERE id=:id`, databasePayload,
	)
	if updateError != nil {
		logging.LogError(updateError, "Failed to update payload's build message")
	}
}
