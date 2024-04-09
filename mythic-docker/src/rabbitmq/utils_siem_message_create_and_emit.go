package rabbitmq

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"time"
)

func emitTaskLog(taskId int) {
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
    operation.name "operation.name",
    operator.username "operator.username"
    FROM task
    JOIN operation on task.operation_id = operation.id
    JOIN operator on task.operator_id = operator.id
    WHERE task.id=$1`, taskId); err != nil {
		logging.LogError(err, "Failed to fetch task data for log emit")
	} else {
		data := GetTaskMessageTaskInformation(taskId)
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   task.OperationID,
			OperationName: task.Operation.Name,
			OperatorName:  task.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_TASK,
			Data:          data,
		})
	}
}
func emitPayloadLog(payloadId int) {
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT
    	payload.*,
    	operation.name "operation.name",
    	operator.username "operator.username"
    	FROM payload
    	JOIN operation ON payload.operation_id = operation.id
    	JOIN operator ON payload.operator_id = operator.id
    	WHERE payload.id=$1`, payloadId); err != nil {
		logging.LogError(err, "Failed to fetch payload data for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   payload.OperationID,
			OperationName: payload.Operation.Name,
			OperatorName:  payload.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_PAYLOAD,
			Data:          payload,
		})
	}
}
func emitKeylogLog(keylogId int) {
	keylog := databaseStructs.Keylog{}
	if err := database.DB.Get(&keylog, `SELECT
		keylog.*,
		operation.name "operation.name",
		operator.username "task.operator.username"
		FROM keylog
		JOIN operation ON keylog.operation_id = operation.id
		JOIN task ON keylog.task_id = task.id
		JOIN operator ON task.operator_id = operator.id
		WHERE keylog.id=$1`, keylogId); err != nil {
		logging.LogError(err, "Failed to fetch keylog data for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   keylog.OperationID,
			OperationName: keylog.Operation.Name,
			OperatorName:  keylog.Task.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_KEYLOG,
			Data:          keylog,
		})
	}
}
func EmitCredentialLog(credentialId int) {
	credential := databaseStructs.Credential{}
	if err := database.DB.Get(&credential, `SELECT
		credential.*,
		operation.name "operation.name",
		operator.username "operator.username"
		FROM credential
		JOIN operation on credential.operation_id = operation.id
		JOIN operator on credential.operator_id = operator.id
		WHERE credential.id=$1`, credentialId); err != nil {
		logging.LogError(err, "Failed to fetch credential for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   credential.OperationID,
			OperationName: credential.Operation.Name,
			OperatorName:  credential.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_CREDENTIAL,
			Data:          credential,
		})
	}
}
func emitArtifactLog(artifactId int) {
	artifact := databaseStructs.Taskartifact{}
	if err := database.DB.Get(&artifact, `SELECT
		taskartifact.*,
		operation.name "operation.name",
		operator.username "task.operator.username"
		FROM taskartifact
		JOIN operation on taskartifact.operation_id = operation.id
		JOIN task on taskartifact.task_id = task.id
		JOIN operator on task.operator_id = operator.id
		WHERE taskartifact.id=$1`, artifactId); err != nil {
		logging.LogError(err, "Failed to fetch artifact data for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   artifact.OperationID,
			OperationName: artifact.Operation.Name,
			OperatorName:  artifact.Task.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_ARTIFACT,
			Data:          artifact,
		})
	}
}
func EmitFileLog(fileId int) {
	file := databaseStructs.Filemeta{}
	if err := database.DB.Get(&file, `SELECT
		filemeta.*,
		operation.name "operation.name",
		operator.username "operator.username"
		FROM filemeta
		JOIN operation on filemeta.operation_id = operation.id
		JOIN operator on filemeta.operator_id = operator.id
		WHERE filemeta.id=$1`, fileId); err != nil {
		logging.LogError(err, "Failed to fetch file data for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   file.OperationID,
			OperationName: file.Operation.Name,
			OperatorName:  file.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_FILE,
			Data:          file,
		})
	}
}
func emitCallbackLog(callbackId int) {
	callback := databaseStructs.Callback{}
	if err := database.DB.Get(&callback, `SELECT
		callback.*,
		operation.name "operation.name",
		operator.username "operator.username"
		FROM callback
		JOIN operation on callback.operation_id = operation.id
		JOIN operator on callback.operator_id = operator.id
		WHERE callback.id=$1`, callbackId); err != nil {
		logging.LogError(err, "Failed to get callback data for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   callback.OperationID,
			OperationName: callback.Operation.Name,
			OperatorName:  callback.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_CALLBACK,
			Data:          callback,
		})
	}

}
func emitResponseLog(responseId int) {
	response := databaseStructs.Response{}
	if err := database.DB.Get(&response, `SELECT
		response.*,
		operation.name "operation.name",
		task.id "task.id",
		task.display_id "task.display_id",
		operator.username "task.operator.username"
		FROM response
		JOIN operation on response.operation_id = operation.id
		JOIN task on response.task_id = task.id
		JOIN operator on task.operator_id = operator.id
		WHERE response.id=$1`, responseId); err != nil {
		logging.LogError(err, "Failed to get response data for log emit")
	} else {
		go RabbitMQConnection.EmitSiemMessage(LoggingMessage{
			OperationID:   response.OperationID,
			OperationName: response.Operation.Name,
			OperatorName:  response.Task.Operator.Username,
			Timestamp:     time.Now().UTC(),
			Action:        LOG_TYPE_RESPONSE,
			Data: map[string]interface{}{
				"id":              response.ID,
				"response":        response.Response,
				"task_id":         response.TaskID,
				"task_display_id": response.Task.DisplayID,
				"timestamp":       response.Timestamp,
			},
		})
	}
}
