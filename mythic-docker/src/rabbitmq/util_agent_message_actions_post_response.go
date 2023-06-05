package rabbitmq

import (
	"bytes"
	"crypto/md5"
	"crypto/sha1"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/mitchellh/mapstructure"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/its-a-feature/Mythic/utils"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type agentMessagePostResponseMessage struct {
	Responses []agentMessagePostResponse `json:"responses" mapstructure:"responses"`
	Other     map[string]interface{}     `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in so we can reply back with them
}

type agentMessagePostResponse struct {
	TaskID          string                                    `json:"task_id" mapstructure:"task_id"`
	SequenceNumber  *int64                                    `json:"sequence_num,omitempty" mapstructure:"sequence_num,omitempty"`
	Completed       *bool                                     `json:"completed,omitempty" mapstructure:"completed,omitempty"`
	UserOutput      *string                                   `json:"user_output,omitempty" mapstructure:"user_output,omitempty"`
	Status          *string                                   `json:"status,omitempty" mapstructure:"status,omitempty"`
	FileBrowser     *agentMessagePostResponseFileBrowser      `json:"file_browser,omitempty" mapstructure:"file_browser,omitempty"`
	RemovedFiles    *[]agentMessagePostResponseRemovedFiles   `json:"removed_files,omitempty" mapstructure:"removed_files,omitempty"`
	Credentials     *[]agentMessagePostResponseCredentials    `json:"credentials,omitempty" mapstructure:"credentials,omitempty"`
	Artifacts       *[]agentMessagePostResponseArtifacts      `json:"artifacts,omitempty" mapstructure:"artifacts,omitempty"`
	Processes       *[]agentMessagePostResponseProcesses      `json:"processes,omitempty" mapstructure:"processes,omitempty"`
	Edges           *[]agentMessagePostResponseEdges          `json:"edges,omitempty" mapstructure:"edges,omitempty"`
	Commands        *[]agentMessagePostResponseCommands       `json:"commands,omitempty" mapstructure:"commands,omitempty"`
	ProcessResponse *interface{}                              `json:"process_response,omitempty" mapstructure:"process_response,omitempty"`
	Keylogs         *[]agentMessagePostResponseKeylogs        `json:"keylogs,omitempty" mapstructure:"keylogs,omitempty"`
	Tokens          *[]agentMessagePostResponseToken          `json:"tokens,omitempty" mapstructure:"tokens,omitempty"`
	CallbackTokens  *[]agentMessagePostResponseCallbackTokens `json:"callback_tokens,omitempty" mapstructure:"callback_tokens,omitempty"`
	Download        *agentMessagePostResponseDownload         `json:"download,omitempty" mapstructure:"download,omitempty"`
	Upload          *agentMessagePostResponseUpload           `json:"upload,omitempty" mapstructure:"upload,omitempty"`
	Alerts          *[]agentMessagePostResponseAlert          `json:"alerts,omitempty" mapstructure:"alerts,omitempty"`
	Other           map[string]interface{}                    `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in so we can reply back with them
}

var ValidCredentialTypesList = []string{"plaintext", "certificate", "hash", "key", "ticket", "cookie", "hex"}

type agentMessagePostResponseFileBrowser struct {
	Host          string                                         `json:"host" mapstructure:"host"`
	IsFile        bool                                           `json:"is_file" mapstructure:"is_file"`
	Permissions   interface{}                                    `json:"permissions" mapstructure:"permissions"`
	Name          string                                         `json:"name" mapstructure:"name"`
	ParentPath    string                                         `json:"parent_path" mapstructure:"parent_path"`
	Success       bool                                           `json:"success" mapstructure:"success"`
	AccessTime    uint64                                         `json:"access_time" mapstructure:"access_time"`
	ModifyTime    uint64                                         `json:"modify_time" mapstructure:"modify_time"`
	Size          uint64                                         `json:"size" mapstructure:"size"`
	UpdateDeleted *bool                                          `json:"update_deleted,omitempty" mapstructure:"update_deleted,omitempty"` // option to treat this response as full source of truth
	Files         *[]agentMessagePostResponseFileBrowserChildren `json:"files" mapstructure:"files"`
}
type agentMessagePostResponseFileBrowserChildren struct {
	IsFile      bool        `json:"is_file" mapstructure:"is_file"`
	Permissions interface{} `json:"permissions" mapstructure:"permissions"`
	Name        string      `json:"name" mapstructure:"name"`
	AccessTime  uint64      `json:"access_time" mapstructure:"access_time"`
	ModifyTime  uint64      `json:"modify_time" mapstructure:"modify_time"`
	Size        uint64      `json:"size" mapstructure:"size"`
}
type agentMessagePostResponseRemovedFiles struct {
	Host *string `json:"host,omitempty" mapstructure:"host,omitempty"`
	Path string  `json:"path" mapstructure:"path"` // full path to file removed
}
type agentMessagePostResponseCredentials struct {
	CredentialType string `json:"credential_type" mapstructure:"credential_type"`
	Realm          string `json:"realm" mapstructure:"realm"`
	Account        string `json:"account" mapstructure:"account"`
	Credential     string `json:"credential" mapstructure:"credential"`
	Comment        string `json:"comment" mapstructure:"comment"`
	ExtraData      string `json:"metadata" mapstructure:"metadata"`
}
type agentMessagePostResponseArtifacts struct {
	BaseArtifact string  `json:"base_artifact" mapstructure:"base_artifact"`
	Artifact     string  `json:"artifact" mapstructure:"artifact"`
	Host         *string `json:"host" mapstructure:"host"`
}
type agentMessagePostResponseProcesses struct {
	Host                   *string                `mapstructure:"host,omitempty" json:"host,omitempty"`
	ProcessID              int                    `mapstructure:"process_id" json:"process_id"`
	ParentProcessID        int                    `mapstructure:"parent_process_id" json:"parent_process_id"`
	Architecture           string                 `mapstructure:"architecture" json:"architecture"`
	BinPath                string                 `mapstructure:"bin_path" json:"bin_path"`
	Name                   string                 `mapstructure:"name" json:"name"`
	User                   string                 `mapstructure:"user" json:"user"`
	CommandLine            string                 `mapstructure:"command_line" json:"command_line"`
	IntegrityLevel         int                    `mapstructure:"integrity_level" json:"integrity_level"`
	StartTime              uint64                 `mapstructure:"start_time" json:"start_time"`
	Description            string                 `mapstructure:"description" json:"description"`
	Signer                 string                 `mapstructure:"signer" json:"signer"`
	ProtectionProcessLevel int                    `mapstructure:"protected_process_level" json:"protected_process_level"`
	UpdateDeleted          *bool                  `mapstructure:"update_deleted,omitempty" json:"update_deleted,omitempty"`
	OS                     *string                `mapstructure:"os,omitempty" json:"os,omitempty"`
	Other                  map[string]interface{} `json:"-" mapstructure:",remain"`
}
type agentMessagePostResponseEdges struct {
	Source      string `json:"source" mapstructure:"source"`
	Destination string `json:"destination" mapstructure:"destination"`
	Action      string `json:"action" mapstructure:"action"`
	C2Profile   string `json:"c2_profile" mapstructure:"c2_profile"`
	Metadata    string `json:"metadata" mapstructure:"metadata"`
}
type agentMessagePostResponseCommands struct {
	Action  string `json:"action" mapstructure:"action"`
	Command string `json:"cmd" mapstructure:"cmd"`
}
type agentMessagePostResponseKeylogs struct {
	WindowTitle string `json:"window_title" mapstructure:"window_title"`
	User        string `json:"user" mapstructure:"user"`
	Keystrokes  string `json:"keystrokes" mapstructure:"keystrokes"`
}
type agentMessagePostResponseToken struct {
	Action             string `json:"action" mapstructure:"action"`
	TokenID            uint64 `json:"token_id" mapstructure:"token_id"`
	User               string `json:"user" mapstructure:"user"`
	Groups             string `json:"groups" mapstructure:"groups"`
	Privileges         string `json:"privileges" mapstructure:"privileges"`
	ThreadID           int    `json:"thread_id" mapstructure:"thread_id"`
	ProcessID          int    `json:"process_id" mapstructure:"process_id"`
	SessionID          int    `json:"session_id" mapstructure:"session_id"`
	LogonSID           string `json:"logon_sid" mapstructure:"logon_sid"`
	IntegrityLevelSID  string `json:"integrity_level_sid" mapstructure:"integrity_level_sid"`
	Restricted         bool   `json:"restricted" mapstructure:"restricted"`
	DefaultDacl        string `json:"default_dacl" mapstructure:"default_dacl"`
	Handle             int    `json:"handle" mapstructure:"handle"`
	Capabilities       string `json:"capabilities" mapstructure:"capabilities"`
	AppContainerSID    string `json:"app_container_sid" mapstructure:"app_container_sid"`
	AppContainerNumber int    `json:"app_container_number" mapstructure:"app_container_number"`
}
type agentMessagePostResponseCallbackTokens struct {
	Action  string  `json:"action" mapstructure:"action"`
	Host    *string `json:"host,omitempty" mapstructure:"host,omitempty"`
	TokenId uint64  `json:"token_id" mapstructure:"token_id"`
	// optionally also provide all the token information
	TokenInfo *agentMessagePostResponseToken `mapstructure:"token"`
}
type agentMessagePostResponseDownload struct {
	// Transfer a file from agent -> Mythic
	TotalChunks  *int                   `json:"total_chunks,omitempty" mapstructure:"total_chunks,omitempty"`
	ChunkSize    *int                   `json:"chunk_size,omitempty" mapstructure:"chunk_size,omitempty"`
	ChunkData    *string                `json:"chunk_data,omitempty" mapstructure:"chunk_data,omitempty"`
	ChunkNum     *int                   `json:"chunk_num,omitempty" mapstructure:"chunk_num,omitempty"`
	FullPath     *string                `json:"full_path,omitempty" mapstructure:"full_path,omitempty"`
	FileID       *string                `json:"file_id,omitempty" mapstructure:"file_id,omitempty"`
	Host         *string                `json:"host,omitempty" mapstructure:"host,omitempty"`
	IsScreenshot *bool                  `json:"is_screenshot,omitempty" mapstructure:"is_screenshot,omitempty"`
	Other        map[string]interface{} `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in, so we can reply back with them
}
type agentMessagePostResponseUpload struct {
	// Transfer a file from Mythic -> Agent
	ChunkSize *int                   `json:"chunk_size,omitempty" mapstructure:"chunk_size,omitempty"`
	ChunkNum  int                    `json:"chunk_num" mapstructure:"chunk_num"`
	FullPath  *string                `json:"full_path,omitempty" mapstructure:"full_path,omitempty"`
	FileID    *string                `json:"file_id,omitempty" mapstructure:"file_id,omitempty"`
	Host      *string                `json:"host,omitempty" mapstructure:"host,omitempty"`
	Other     map[string]interface{} `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in, so we can reply back with them
}
type agentMessagePostResponseUploadResponse struct {
	FileID      string `json:"file_id" mapstructure:"file_id"`
	TotalChunks int    `json:"total_chunks" mapstructure:"total_chunks"`
	ChunkData   []byte `json:"chunk_data" mapstructure:"chunk_data"`
	ChunkNum    int    `json:"chunk_num" mapstructure:"chunk_num"`
}
type agentMessagePostResponseAlert struct {
	Source *string `json:"source,omitempty" mapstructure:"source,omitempty"`
	Alert  string  `json:"alert" mapstructure:"alert"`
}

func handleAgentMessagePostResponse(incoming *map[string]interface{}, uUIDInfo *cachedUUIDInfo) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "post_response",
		  "responses": [
			{}
		  ]
		}
	*/
	agentMessage := agentMessagePostResponseMessage{}
	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into handleAgentMessagePostResponse struct: %s", err.Error()))
	} else {
		responses := []map[string]interface{}{}
		// iterate over the agent messages
		for _, agentResponse := range agentMessage.Responses {
			mythicResponse := map[string]interface{}{
				"task_id": agentResponse.TaskID,
				"status":  "success",
			}
			logging.LogDebug("Got response data from agent", "response data", agentResponse, "extra keys", agentResponse.Other)
			// every response should be tied to some task
			currentTask := databaseStructs.Task{AgentTaskID: agentResponse.TaskID}
			if err := database.DB.Get(&currentTask, `SELECT
			task.id, task.status, task.completed, task.status_timestamp_processed, task.operator_id, task.operation_id,
			callback.host "callback.host",
			callback.user "callback.user",
			callback.id "callback.id",
			callback.display_id "callback.display_id",
			payload.payload_type_id "callback.payload.payload_type_id",
			payload.os "callback.payload.os"
			FROM task
			JOIN callback ON task.callback_id = callback.id
			JOIN payload ON callback.registered_payload_id = payload.id
			WHERE task.agent_task_id=$1`, currentTask.AgentTaskID); err != nil {
				logging.LogError(err, "Failed to find task", "task id", currentTask.AgentTaskID)
				mythicResponse["status"] = "error"
				mythicResponse["error"] = "Failed to find task"
				responses = append(responses, mythicResponse)
				continue
			} else {
				// always update the timestamp
				updatedToCompleted := false
				currentTask.Timestamp = time.Now().UTC()
				// status_timestamp_processed might be updated if this is the first time we actually got something back from the agent
				if !currentTask.StatusTimestampProcessed.Valid {
					currentTask.StatusTimestampProcessed.Time = currentTask.Timestamp
					currentTask.StatusTimestampProcessed.Valid = true
				}
				if agentResponse.Completed != nil {
					if *agentResponse.Completed {
						if !currentTask.Completed {
							updatedToCompleted = true
						}
						currentTask.Completed = *agentResponse.Completed
					}
				}
				if agentResponse.Status != nil && *agentResponse.Status != "" {
					if currentTask.Status != PT_TASK_FUNCTION_STATUS_COMPLETED {
						currentTask.Status = *agentResponse.Status
					}
				} else if agentResponse.Completed != nil && *agentResponse.Completed {
					currentTask.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
				} else if currentTask.Status == PT_TASK_FUNCTION_STATUS_PROCESSING {
					currentTask.Status = PT_TASK_FUNCTION_STATUS_PROCESSED
				}
				if agentResponse.UserOutput != nil {
					// do it in the background - the agent doesn't need the result of this directly
					handleAgentMessagePostResponseUserOutput(currentTask, agentResponse)
				}
				if agentResponse.FileBrowser != nil {
					// do it in the background - the agent doesn't need the result of this directly
					go handleAgentMessagePostResponseFileBrowser(currentTask, agentResponse.FileBrowser)
				}
				if agentResponse.Processes != nil {
					go handleAgentMessagePostResponseProcesses(currentTask, agentResponse.Processes)
				}
				if agentResponse.RemovedFiles != nil {
					go handleAgentMessagePostResponseRemovedFiles(currentTask, agentResponse.RemovedFiles)
				}
				if agentResponse.Credentials != nil {
					go handleAgentMessagePostResponseCredentials(currentTask, agentResponse.Credentials)
				}
				if agentResponse.Artifacts != nil {
					go handleAgentMessagePostResponseArtifacts(currentTask, agentResponse.Artifacts)
				}
				if agentResponse.Keylogs != nil {
					go handleAgentMessagePostResponseKeylogs(currentTask, agentResponse.Keylogs)
				}
				if agentResponse.Tokens != nil && agentResponse.CallbackTokens != nil {
					// need to make sure we process tokens _then_ process callback tokens
					go handleAgentMessagePostResponseCallbackTokensAndTokens(currentTask, agentResponse.Tokens, agentResponse.CallbackTokens)
				} else {
					if agentResponse.Tokens != nil {
						go handleAgentMessagePostResponseTokens(currentTask, agentResponse.Tokens)
					}
					if agentResponse.CallbackTokens != nil {
						go handleAgentMessagePostResponseCallbackTokens(currentTask, agentResponse.CallbackTokens)
					}
				}
				if agentResponse.ProcessResponse != nil {
					go handleAgentMessagePostResponseProcessResponse(currentTask, agentResponse.ProcessResponse)
				}
				if agentResponse.Commands != nil {
					go handleAgentMessagePostResponseCommands(currentTask, agentResponse.Commands)
				}
				if agentResponse.Edges != nil {
					go handleAgentMessagePostResponseEdges(agentResponse.Edges)
				}
				if agentResponse.Download != nil {
					if newFileID, err := handleAgentMessagePostResponseDownload(currentTask, agentResponse); err != nil {
						mythicResponse["status"] = "error"
						mythicResponse["error"] = err.Error()
					} else {
						mythicResponse["file_id"] = newFileID
					}
				}
				if agentResponse.Upload != nil {
					if uploadResponse, err := handleAgentMessagePostResponseUpload(currentTask, agentResponse); err != nil {
						mythicResponse["status"] = "error"
						mythicResponse["error"] = err.Error()
						logging.LogError(err, "Failed to handle agent upload")
					} else if err := mapstructure.Decode(uploadResponse, &mythicResponse); err != nil {
						mythicResponse["status"] = "error"
						mythicResponse["error"] = err.Error()
						logging.LogError(err, "Failed to decode mapstructure for agent upload response")
					}
				}
				if agentResponse.Alerts != nil {
					go handleAgentMessagePostResponseAlerts(currentTask.OperationID, agentResponse.Alerts)
				}
				reflectBackOtherKeys(&mythicResponse, &agentResponse.Other)
				// always updating at least the timestamp for the last thing that happened
				if _, err := database.DB.NamedExec(`UPDATE task SET
				status=:status, completed=:completed, status_timestamp_processed=:status_timestamp_processed, "timestamp"=:timestamp
				WHERE id=:id`, currentTask); err != nil {
					logging.LogError(err, "Failed to update task from agent response")
					mythicResponse["status"] = "error"
					mythicResponse["error"] = "Failed to update task"
					responses = append(responses, mythicResponse)
				} else {
					responses = append(responses, mythicResponse)
					if currentTask.Completed && updatedToCompleted {
						// use updatedToCompleted to try to make sure we only do this once per task
						go CheckAndProcessTaskCompletionHandlers(currentTask.ID)
						go emitTaskLog(currentTask.ID)
					}
				}
			}
		}
		response := map[string]interface{}{}
		response["responses"] = responses
		reflectBackOtherKeys(&response, &agentMessage.Other)
		// remove responses so that we don't accidentally process it twice
		delete(*incoming, "responses")
		return response, nil
	}
}

func handleAgentMessagePostResponseUserOutput(task databaseStructs.Task, agentResponse agentMessagePostResponse) {
	responseOutput := databaseStructs.Response{
		Timestamp:   time.Now().UTC(),
		TaskID:      task.ID,
		Response:    []byte(*agentResponse.UserOutput),
		OperationID: task.OperationID,
	}
	if len(*agentResponse.UserOutput) == 0 {
		//logging.LogError(nil, "Tried to add response of 0 bytes, returning")
		return
	}
	if agentResponse.SequenceNumber != nil {
		// if we're tracking sequence numbers, then there shouldn't be a matching sequence number for this task to prevent replays
		responseOutput.SequenceNumber.Valid = true
		responseOutput.SequenceNumber.Int64 = *agentResponse.SequenceNumber
		if _, err := database.DB.NamedQuery(`SELECT id 
		FROM response
		WHERE sequence_number=:sequence_number AND task_id=:task_id`, responseOutput); err == sql.ErrNoRows {
			// we don't have this sequence number for this task yet, so we're safe to insert it
			logging.LogInfo("Sequence number is not NULL!")
		} else if err != nil {
			logging.LogError(err, "Failed to fetch responses when looking for an existing sequence number")
			return
		} else {
			// this sequence number and task do exist, so don't insert it
			logging.LogError(nil, "Got a duplicate sequence number for a response", "task_id", responseOutput.TaskID, "sequence number", *agentResponse.SequenceNumber)
			return
		}
	}
	if statement, err := database.DB.PrepareNamed(`INSERT INTO response
		("timestamp", task_id, response, sequence_number, operation_id)
		VALUES (:timestamp, :task_id, :response, :sequence_number, :operation_id)
		RETURNING id`); err != nil {
		logging.LogError(err, "Failed to prepare new named statement for user_output", "task_id", responseOutput.TaskID)
	} else if err := statement.Get(&responseOutput.ID, responseOutput); err != nil {
		logging.LogError(err, "Failed to insert new user_output", "task_id", responseOutput.TaskID)
	} else {
		go emitResponseLog(responseOutput.ID)
	}
}
func handleAgentMessagePostResponseRemovedFiles(task databaseStructs.Task, removedFiles *[]agentMessagePostResponseRemovedFiles) error {
	// mark the file / folder as removed and recursively mark all children as deleted too
	for _, rmData := range *removedFiles {
		host := task.Callback.Host
		if rmData.Host != nil && *rmData.Host != "" {
			host = strings.ToUpper(*rmData.Host)
		}
		likePath := rmData.Path + "%"
		likePath = strings.ReplaceAll(likePath, "\\", "\\\\")
		//logging.LogInfo("updating removal path", "path", likePath, "host", host)
		if _, err := database.DB.Exec(`UPDATE mythictree SET
		  deleted=true
		  WHERE host=$1 AND full_path LIKE $2 AND operation_id=$3 AND "tree_type"=$4`,
			host, likePath, task.OperationID, databaseStructs.TREE_TYPE_FILE); err != nil {
			logging.LogError(err, "Failed to mark file and children as deleted")
			return err
		}
	}
	return nil
}
func handleAgentMessagePostResponseCredentials(task databaseStructs.Task, credentials *[]agentMessagePostResponseCredentials) error {
	// mark the file / folder as removed and recursively mark all children as deleted too
	for _, newCred := range *credentials {
		databaseCred := databaseStructs.Credential{
			Realm:       newCred.Realm,
			Account:     newCred.Account,
			OperationID: task.OperationID,
			Credential:  newCred.Credential,
			Deleted:     false,
			Comment:     newCred.Comment,
			Metadata:    newCred.ExtraData,
			OperatorID:  task.OperatorID,
		}
		databaseCred.TaskID.Valid = true
		databaseCred.TaskID.Int64 = int64(task.ID)
		if utils.SliceContains(ValidCredentialTypesList, newCred.CredentialType) {
			databaseCred.Type = newCred.CredentialType
		} else {
			databaseCred.Type = "plaintext"
		}
		// check if the cred already exists. If it does, move on. If it doesn't, create it
		if err := database.DB.Get(&databaseCred, `SELECT * FROM credential WHERE
			 account=$1 AND realm=$2 AND credential=$3 AND operation_id=$4`,
			databaseCred.Account, databaseCred.Realm, databaseCred.Credential, databaseCred.OperationID); err == sql.ErrNoRows {
			// credential doesn't exist, so create it
			if statement, err := database.DB.PrepareNamed(`INSERT INTO credential
				(realm, account, operation_id, credential, deleted, comment, metadata, task_id, "type", operator_id)
				VALUES (:realm, :account, :operation_id, :credential, :deleted, :comment, :metadata, :task_id, :type, :operator_id)
				RETURNING id `); err != nil {
				logging.LogError(err, "Failed to create new credential")
				return err
			} else if err = statement.Get(&databaseCred.ID, databaseCred); err != nil {
				logging.LogError(err, "Failed to create new credential")
				return err
			}
			go EmitCredentialLog(databaseCred.ID)
		} else if err != nil {
			// ran into an issue doing the query
			logging.LogError(err, "Failed to query for credential")
			return err
		} else if databaseCred.Deleted || !databaseCred.TaskID.Valid {
			// the credential exists, make sure it's marked as not deleted
			if _, err := database.DB.Exec(`UPDATE credential SET deleted=false WHERE id=$1`, databaseCred.ID); err != nil {
				logging.LogError(err, "failed to update credential that already exists")
			}
		}
	}
	return nil
}
func handleAgentMessagePostResponseArtifacts(task databaseStructs.Task, artifacts *[]agentMessagePostResponseArtifacts) {
	// mark the file / folder as removed and recursively mark all children as deleted too
	for _, newArtifact := range *artifacts {
		databaseArtifact := databaseStructs.Taskartifact{
			Artifact:     []byte(newArtifact.Artifact),
			BaseArtifact: newArtifact.BaseArtifact,
			OperationID:  task.OperationID,
			Host:         task.Callback.Host,
		}
		databaseArtifact.TaskID = task.ID
		if newArtifact.Host != nil && *newArtifact.Host != "" {
			databaseArtifact.Host = strings.ToUpper(*newArtifact.Host)
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO taskartifact
			(artifact, base_artifact, operation_id, host, task_id)
			VALUES (:artifact, :base_artifact, :operation_id, :host, :task_id)
			RETURNING id`); err != nil {
			logging.LogError(err, "Failed to register artifact", "base artifact", newArtifact.BaseArtifact, "artifact", newArtifact.Artifact)
		} else if err = statement.Get(&databaseArtifact.ID, databaseArtifact); err != nil {
			logging.LogError(err, "Failed to register artifact", "base artifact", newArtifact.BaseArtifact, "artifact", newArtifact.Artifact)
		} else {
			go emitArtifactLog(databaseArtifact.ID)
		}
	}

}
func handleAgentMessagePostResponseKeylogs(task databaseStructs.Task, keylogs *[]agentMessagePostResponseKeylogs) error {
	// mark the file / folder as removed and recursively mark all children as deleted too
	for _, keylog := range *keylogs {
		windowTitle := "UNKNOWN"
		user := task.Callback.User
		if keylog.WindowTitle != "" {
			windowTitle = keylog.WindowTitle
		}
		if keylog.User != "" {
			user = keylog.User
		}
		databaseKeylog := databaseStructs.Keylog{
			TaskID:      task.ID,
			Window:      windowTitle,
			User:        user,
			OperationID: task.OperationID,
			Keystrokes:  []byte(keylog.Keystrokes),
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO keylog
			(task_id, "window", "user", operation_id, keystrokes)
			VALUES (:task_id, :window, :user, :operation_id, :keystrokes)
			RETURNING id`); err != nil {
			logging.LogError(err, "Failed to register keylog", "new keylog", databaseKeylog)
			return err
		} else if err = statement.Get(&databaseKeylog.ID, databaseKeylog); err != nil {
			logging.LogError(err, "Failed to register keylog", "new keylog", databaseKeylog)
			return err
		} else {
			go emitKeylogLog(databaseKeylog.ID)
		}
	}
	return nil
}
func addToken(task databaseStructs.Task, token agentMessagePostResponseToken) (int, error) {
	databaseToken := databaseStructs.Token{
		TaskID:             task.ID,
		Deleted:            false,
		Host:               task.Callback.Host,
		OperationID:        task.OperationID,
		TokenID:            token.TokenID,
		User:               token.User,
		Groups:             token.Groups,
		Privileges:         token.Privileges,
		ThreadID:           token.ThreadID,
		ProcessID:          token.ProcessID,
		SessionID:          token.SessionID,
		LogonSID:           token.LogonSID,
		IntegrityLevelSID:  token.IntegrityLevelSID,
		AppContainerSID:    token.AppContainerSID,
		AppContainerNumber: token.AppContainerNumber,
		DefaultDacl:        token.DefaultDacl,
		Restricted:         token.Restricted,
		Handle:             token.Handle,
		Capabilities:       token.Capabilities,
		Timestamp:          time.Now(),
	}
	if statement, err := database.DB.PrepareNamed(`INSERT INTO token
    (task_id, host, operation_id, token_id, "user", "groups", "privileges",
     thread_id, process_id, session_id, logon_sid, integrity_level_sid,
     app_container_sid, app_container_number, default_dacl, restricted, handle, capabilities)
     VALUES 
         (:task_id, :host, :operation_id, :token_id, :user, :groups, :privileges,
          :thread_id, :process_id, :session_id, :logon_sid, :integrity_level_sid,
          :app_container_sid, :app_container_number, :default_dacl, :restricted, :handle, :capabilities)
     ON CONFLICT (host, operation_id, token_id)
     DO UPDATE SET
     task_id=:task_id, "user"=:user, "groups"=:groups, "privileges"=:privileges,
         thread_id=:thread_id, process_id=:process_id, session_id=:session_id,
         logon_sid=:logon_sid, integrity_level_sid=:integrity_level_sid,
         app_container_sid=:app_container_sid, app_container_number=:app_container_number,
         default_dacl=:default_dacl, restricted=:restricted, handle=:handle,
         capabilities=:capabilities, "timestamp"=:timestamp, deleted=false
         RETURNING id`); err != nil {
		logging.LogError(err, "failed to create named statement for insert/update token data")
		return 0, err
	} else if err := statement.Get(&databaseToken.ID, databaseToken); err != nil {
		logging.LogError(err, "Failed to insert/update token data and get back ID")
		return 0, err
	} else {
		return databaseToken.ID, nil
	}
}
func removeToken(task databaseStructs.Task, token agentMessagePostResponseToken) error {
	if _, err := database.DB.Exec(`UPDATE token SET deleted=true WHERE token_id=$1 AND operation_id=$2 AND host=$3`,
		token.TokenID, task.OperationID, task.Callback.Host); err != nil {
		logging.LogError(err, "Failed to mark token as deleted")
		return err
	} else {
		return nil
	}
}
func handleAgentMessagePostResponseTokens(task databaseStructs.Task, tokens *[]agentMessagePostResponseToken) error {
	var err error
	err = nil
	for _, token := range *tokens {
		if token.Action == "add" {
			_, err = addToken(task, token)
		} else if token.Action == "remove" {
			err = removeToken(task, token)
		} else {
			logging.LogError(err, "Unknown action with token", "action", token.Action)
		}

	}
	return err
}
func handleAgentMessagePostResponseCallbackTokens(task databaseStructs.Task, callbackTokens *[]agentMessagePostResponseCallbackTokens) error {
	for _, callbackToken := range *callbackTokens {
		databaseToken := databaseStructs.Token{
			TokenID: callbackToken.TokenId,
			Host:    task.Callback.Host,
		}
		if callbackToken.Host != nil && *callbackToken.Host != "" {
			databaseToken.Host = strings.ToUpper(*callbackToken.Host)
		}
		if callbackToken.Action == "remove" {
			if _, err := database.DB.Exec(`UPDATE callbacktoken SET deleted=true WHERE
				callback_id=$1 AND host=$2 AND token_id=$3`,
				task.Callback.ID, databaseToken.Host, databaseToken.TokenID); err != nil {
				logging.LogError(err, "Failed to remove token from callback")
				return err
			} else {
				logging.LogDebug("Successfully removed token from callback")
			}
		} else if callbackToken.Action == "add" {
			// we want to associate a new token with the callback (one that already exists or create one)
			if callbackToken.TokenInfo != nil {
				// we'll create a new token and associate it with this callback
				if databaseID, err := addToken(task, *callbackToken.TokenInfo); err != nil {
					continue
				} else {
					databaseToken.ID = databaseID
				}
			} else if err := database.DB.Get(&databaseToken, `SELECT id FROM token WHERE
				 token_id=$1 AND host=$2 AND operation_id=$3`,
				databaseToken.TokenID, databaseToken.Host, task.OperationID); err != nil {
				logging.LogError(err, "Failed to find token to add to callback")
				continue
			}
			databaseCallbackToken := databaseStructs.Callbacktoken{
				TokenID:    databaseToken.ID,
				CallbackID: task.Callback.ID,
				TaskID:     task.ID,
				Deleted:    false,
				Host:       databaseToken.Host,
			}
			if _, err := database.DB.NamedExec(`INSERT INTO callbacktoken
					(token_id, callback_id, task_id, host)
					VALUES (:token_id, :callback_id, :task_id, :host)
					ON CONFLICT (token_id, callback_id) DO NOTHING`, databaseCallbackToken); err != nil {
				logging.LogError(err, "Failed to associate token with callback")
				return err
			} else {
				logging.LogDebug("Successfully associated token with callback", "token_id", databaseToken.TokenID, "callback", task.Callback.DisplayID)
			}
		} else {
			logging.LogError(nil, "unknown action for callback token", "action", callbackToken.Action)
		}
	}
	return nil
}
func handleAgentMessagePostResponseCallbackTokensAndTokens(task databaseStructs.Task, tokens *[]agentMessagePostResponseToken, callbackTokens *[]agentMessagePostResponseCallbackTokens) {
	handleAgentMessagePostResponseTokens(task, tokens)
	handleAgentMessagePostResponseCallbackTokens(task, callbackTokens)
}
func handleAgentMessagePostResponseProcessResponse(task databaseStructs.Task, response *interface{}) {
	allTaskData := GetTaskConfigurationForContainer(task.ID)
	processResponseMessage := PtTaskProcessResponseMessage{
		TaskData:     allTaskData,
		ResponseData: *response,
	}
	if err := RabbitMQConnection.SendPtTaskProcessResponse(processResponseMessage); err != nil {
		logging.LogError(err, "In handleAgentMessagePostResponseProcessResponse, but failed to SendPtTaskProcessResponse ")
	}
	return
}
func handleAgentMessagePostResponseCommands(task databaseStructs.Task, commands *[]agentMessagePostResponseCommands) {
	for _, command := range *commands {
		databaseCommand := databaseStructs.Command{
			Cmd:           command.Command,
			PayloadTypeID: task.Callback.Payload.PayloadTypeID,
		}
		if err := database.DB.Get(&databaseCommand, `SELECT 
    		id, version
			FROM command
			WHERE cmd=$1 AND payload_type_id=$2`, databaseCommand.Cmd, databaseCommand.PayloadTypeID); err != nil {
			logging.LogError(err, "Failed to find specified command for loading")
			continue
		}
		if command.Action == "add" {
			// need to register this databaseCommand.ID with the callback
			loadedCommand := databaseStructs.Loadedcommands{
				CommandID:  databaseCommand.ID,
				CallbackID: task.Callback.ID,
				OperatorID: task.OperatorID,
				Version:    databaseCommand.Version,
			}
			if _, err := database.DB.NamedExec(`INSERT INTO loadedcommands
				(command_id, callback_id, operator_id, version)
				VALUES (:command_id, :callback_id, :operator_id, :version)
				ON CONFLICT (command_id, callback_id) DO NOTHING`, loadedCommand); err != nil {
				logging.LogError(err, "Failed to associate command with callback")
			}
		} else if _, err := database.DB.Exec(`DELETE FROM loadedcommands WHERE
			   callback_id=$1 AND command_id=$2`, task.Callback.ID, databaseCommand.ID); err != nil {
			logging.LogError(err, "Failed to remove command from callback")
		}
	}
}
func handleAgentMessagePostResponseDownload(task databaseStructs.Task, agentResponse agentMessagePostResponse) (string, error) {
	// might need to return a file_id if we're initially registering a file for transfer from agent to Mythic
	// two stages:
	/*
		1. sending total_chunks (optionally is_screenshot, host, and full_path) -> return new fileID
		2. sending chunk_data, chunk_num, file_id (optionally is_screenshot, host, full_path) -> return existing fileID
	*/
	// likely looking at step 2
	if agentResponse.Download.FileID != nil && *agentResponse.Download.FileID != "" {
		fileMeta := databaseStructs.Filemeta{AgentFileID: *agentResponse.Download.FileID}
		if err := database.DB.Get(&fileMeta, `SELECT 
			id, "path", total_chunks, chunks_received, host, is_screenshot, full_remote_path, complete, md5, sha1, filename, chunk_size, operation_id
			FROM filemeta
			WHERE agent_file_id=$1`, *agentResponse.Download.FileID); err != nil {
			logging.LogError(err, "Failed to find fileID in agent download request", "fileid", *agentResponse.Download.FileID)
			return "", err
		} else {
			if agentResponse.Download.Host != nil && *agentResponse.Download.Host != "" {
				fileMeta.Host = strings.ToUpper(*agentResponse.Download.Host)
			}
			if agentResponse.Download.FullPath != nil && *agentResponse.Download.FullPath != "" {
				fileMeta.FullRemotePath = []byte(*agentResponse.Download.FullPath)
				if pathPieces, err := utils.SplitFilePathGetHost(*agentResponse.Download.FullPath, "", []string{}); err != nil {
					logging.LogError(err, "Failed to split full path into pieces")
					fileMeta.Filename = []byte(filepath.Base(*agentResponse.Download.FullPath))
				} else {
					fileMeta.Filename = []byte(pathPieces.PathPieces[len(pathPieces.PathPieces)-1])
				}

			}
			if agentResponse.Download.IsScreenshot != nil {
				fileMeta.IsScreenshot = *agentResponse.Download.IsScreenshot
			}
			if !fileMeta.Complete {
				if agentResponse.Download.ChunkData != nil && len(*agentResponse.Download.ChunkData) > 0 {
					fileMeta.ChunksReceived += 1
					// now open and append the chunk data to the end of the file
					base64DecodedFileData := make([]byte, base64.StdEncoding.DecodedLen(len(*agentResponse.Download.ChunkData)))
					var totalBase64Bytes int
					if totalBase64Bytes, err = base64.StdEncoding.Decode(base64DecodedFileData, []byte(*agentResponse.Download.ChunkData)); err != nil {
						logging.LogError(err, "Failed to base64 decode chunk data from agent when downloading file")
						return "", err
					} else if f, err := os.OpenFile(fileMeta.Path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err != nil {
						logging.LogError(err, "Failed to open file to append agent data")
						return "", err
					} else if _, err := f.Write(base64DecodedFileData[:totalBase64Bytes]); err != nil {
						logging.LogError(err, "Failed to write bytes to file in agent download")
						return "", err
					} else {
						if fileMeta.ChunkSize == 0 {
							fileMeta.ChunkSize = totalBase64Bytes
						}
						f.Close()
					}

				}
			}
			// check about updating total chunk count in case the agent didn't know it ahead of time
			if agentResponse.Download.TotalChunks != nil && *agentResponse.Download.TotalChunks > 0 {
				if *agentResponse.Download.TotalChunks > fileMeta.TotalChunks {
					fileMeta.TotalChunks = *agentResponse.Download.TotalChunks
				}
			}
			if fileMeta.ChunksReceived == fileMeta.TotalChunks {
				fileMeta.Complete = true
				// also calculate new md5 and sha1 sums
				sha1Hash := sha1.New()
				md5Hash := md5.New()
				if file, err := os.Open(fileMeta.Path); err != nil {
					logging.LogError(err, "Failed to open file to calculate md5 and sha1 sums")
					return "", err
				} else if _, err := io.Copy(sha1Hash, file); err != nil {
					logging.LogError(err, "Failed to copy file contents for sha1 hash")
					return "", err
				} else if _, err := file.Seek(0, 0); err != nil {
					logging.LogError(err, "Failed to move file pointer back to beginning")
				} else if _, err := io.Copy(md5Hash, file); err != nil {
					logging.LogError(err, "Failed to copy file contents for md5 hash")
					return "", err
				} else {
					fileMeta.Sha1 = hex.EncodeToString(sha1Hash.Sum(nil))
					fileMeta.Md5 = hex.EncodeToString(md5Hash.Sum(nil))
				}
			}
			if _, err := database.DB.NamedExec(`UPDATE filemeta SET
			chunks_received=:chunks_received, host=:host, is_screenshot=:is_screenshot, 
			full_remote_path=:full_remote_path, complete=:complete, md5=:md5, sha1=:sha1,
			filename=:filename, total_chunks=:total_chunks, chunk_size=:chunk_size
			WHERE id=:id`, fileMeta); err != nil {
				logging.LogError(err, "Failed to update filemeta based on agent file download")
				return "", err
			} else {
				go EmitFileLog(fileMeta.ID)
				return fileMeta.AgentFileID, nil
			}
		}
	} else if agentResponse.Download.TotalChunks != nil {
		// new to make a new file_id and register it for the agent to use for downloading a file
		// likely looking at step 1
		var err error
		fileMeta := databaseStructs.Filemeta{
			TotalChunks:         *agentResponse.Download.TotalChunks,
			IsDownloadFromAgent: true,
			ChunksReceived:      0,
			OperationID:         task.OperationID,
			OperatorID:          task.OperatorID,
			Timestamp:           time.Now().UTC(),
		}
		if *agentResponse.Download.TotalChunks == 0 {
			fileMeta.Complete = true
		}
		if agentResponse.Download.ChunkSize != nil {
			fileMeta.ChunkSize = *agentResponse.Download.ChunkSize
		} else {
			fileMeta.ChunkSize = 0
		}
		fileMeta.TaskID.Valid = true
		fileMeta.TaskID.Int64 = int64(task.ID)
		if fileMeta.AgentFileID, fileMeta.Path, err = GetSaveFilePath(); err != nil {
			logging.LogError(err, "Failed to create new save file on disk for agent download")
			return "", err
		}
		if agentResponse.Download.IsScreenshot != nil {
			fileMeta.IsScreenshot = *agentResponse.Download.IsScreenshot
		}
		if agentResponse.Download.Host != nil && *agentResponse.Download.Host != "" {
			fileMeta.Host = strings.ToUpper(*agentResponse.Download.Host)
		} else {
			fileMeta.Host = strings.ToUpper(task.Callback.Host)
		}
		if agentResponse.Download.FullPath != nil && *agentResponse.Download.FullPath != "" {
			fileMeta.FullRemotePath = []byte(*agentResponse.Download.FullPath)
			if pathPieces, err := utils.SplitFilePathGetHost(*agentResponse.Download.FullPath, "", []string{}); err != nil {
				logging.LogError(err, "Failed to split full path into pieces")
				fileMeta.Filename = []byte(filepath.Base(*agentResponse.Download.FullPath))
			} else {
				fileMeta.Filename = []byte(pathPieces.PathPieces[len(pathPieces.PathPieces)-1])
			}
		} else {
			fileMeta.Filename = []byte(time.Now().UTC().Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS))
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,chunk_size,"path",operation_id,complete,comment,operator_id,delete_after_fetch,md5,sha1,agent_file_id,full_remote_path,task_id,is_download_from_agent,is_screenshot,host)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :full_remote_path, :task_id, :is_download_from_agent, :is_screenshot, :host)
			RETURNING id`); err != nil {
			logging.LogError(err, "Failed to save file metadata to database")
			return "", err
		} else if err = statement.Get(&fileMeta.ID, fileMeta); err != nil {
			logging.LogError(err, "Failed to save file to database")
			return "", err
		} else {
			go EmitFileLog(fileMeta.ID)
			go addFileMetaToMythicTree(task, fileMeta)
			return fileMeta.AgentFileID, nil
		}
	} else {
		errorString := "download request without total_chunks or file_id"
		logging.LogError(nil, errorString)
		return "", errors.New(errorString)
	}
}
func handleAgentMessagePostResponseUpload(task databaseStructs.Task, agentResponse agentMessagePostResponse) (agentMessagePostResponseUploadResponse, error) {
	// transferring a file from Mythic to the agent.
	// The agent knows of a file_id and requests a certain size chunk from it, we respond with the
	uploadResponse := agentMessagePostResponseUploadResponse{}
	if agentResponse.Upload.FileID != nil && *agentResponse.Upload.FileID != "" {
		fileMeta := databaseStructs.Filemeta{AgentFileID: *agentResponse.Upload.FileID}
		if err := database.DB.Get(&fileMeta, `SELECT 
			*
			FROM filemeta
			WHERE agent_file_id=$1 AND operation_id=$2`, *agentResponse.Upload.FileID, task.OperationID); err != nil {
			go SendAllOperationsMessage(fmt.Sprintf("Failed to find fileID in agent upload request: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
			logging.LogError(err, "Failed to find fileID in agent upload request", "file_id", *agentResponse.Upload.FileID)
			return uploadResponse, err
		} else {
			// we found the file
			// update in the background so the agent can get the necessary data asap
			go updateFileMetaFromUpload(fileMeta, task, agentResponse, uploadResponse)
			chunkSize := float64(512000)
			if agentResponse.Upload.ChunkSize != nil {
				chunkSize = float64(*agentResponse.Upload.ChunkSize)
			}
			if !fileMeta.Complete {
				logging.LogError(nil, "Trying to upload a file to an agent that isn't fully on Mythic's server yet")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - not completely uploaded to Mythic yet: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return uploadResponse, errors.New("trying to upload a file to an agent that isn't fully on Mythic's server yet")
			} else if fileMeta.Deleted {
				logging.LogError(nil, "Trying to upload a file to an agent that is deleted")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - file was deleted from Mythic: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return uploadResponse, errors.New("trying to upload a file to an agent that is deleted")
			} else if fileStat, err := os.Stat(fileMeta.Path); err != nil {
				logging.LogError(err, "Failed to find file on disk")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - file was not found on disk: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return uploadResponse, errors.New("trying to upload a file to an agent that was not found on disk")
			} else {
				totalChunks := int(math.Ceil(float64(fileStat.Size()) / chunkSize))
				chunkData := make([]byte, int64(chunkSize))
				// for legacy reasons, chunks start at 1
				chunkNum := agentResponse.Upload.ChunkNum - 1
				if chunkNum < 0 {
					return uploadResponse, nil
				}
				if chunkNum >= totalChunks {
					logging.LogError(nil, "Requested chunk number greater than number of available chunks for file")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - Requested chunk number greater than number of available chunks for file: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
					return uploadResponse, errors.New("requested chunk number greater than number of available chunks for file")
				} else if file, err := os.Open(fileMeta.Path); err != nil {
					logging.LogError(err, "Failed to open file to get chunk for agent upload")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - Failed to open file on disk: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
					return uploadResponse, errors.New("failed to open file to get chunk for agent upload")
				} else if _, err := file.Seek(int64(chunkNum*int(chunkSize)), 0); err != nil {
					logging.LogError(err, "Failed to seek file to get chunk for agent upload")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - Failed to seek file on disk: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
					return uploadResponse, errors.New("failed to seek file to get chunk for agent upload")
				} else if bytesRead, err := file.Read(chunkData); err != nil {
					logging.LogError(err, "Failed to read file to get chunk for agent upload")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to transfer file to agent - Failed to read file on disk: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
					return uploadResponse, errors.New("failed to read file to get chunk for agent upload")
				} else {
					uploadResponse.ChunkData = chunkData[:bytesRead]
					uploadResponse.TotalChunks = totalChunks
					uploadResponse.ChunkNum = agentResponse.Upload.ChunkNum
					uploadResponse.FileID = *agentResponse.Upload.FileID
					if uploadResponse.TotalChunks == uploadResponse.ChunkNum && fileMeta.DeleteAfterFetch {
						go uploadDeleteAfterFetch(fileMeta)
					}
					return uploadResponse, nil
				}
			}
		}
	} else {
		logging.LogError(nil, "Trying to upload a file, but no file_id specified for the transfer")
		return uploadResponse, errors.New("no file_id specified")
	}
}
func uploadDeleteAfterFetch(fileMeta databaseStructs.Filemeta) {
	fileMeta.Deleted = true
	if err := os.Remove(fileMeta.Path); err != nil {
		logging.LogError(err, "Failed to remove file after an agent fetched it with delete after fetch set to true")
	} else if _, err = database.DB.NamedExec(`UPDATE filemeta SET deleted=true WHERE id=:id`, fileMeta); err != nil {
		logging.LogError(err, "Failed to mark file as deleted in database")
	}
}
func updateFileMetaFromUpload(fileMeta databaseStructs.Filemeta, task databaseStructs.Task, agentResponse agentMessagePostResponse, uploadResponse agentMessagePostResponseUploadResponse) {
	// update the host/full path/filename if they're specified
	// create a new fileMeta object for the full path/host/task if the fileMeta.task is different from task
	if agentResponse.Upload.FullPath != nil && *agentResponse.Upload.FullPath != "" {
		if filePieces, err := utils.SplitFilePathGetHost(*agentResponse.Upload.FullPath, "", []string{}); err != nil {
			logging.LogError(err, "Failed to parse out the full path returned by the agent for an upload")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to parse out the full path returned by the agent for an upload: %v\n", err), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
			return
		} else {
			if filePieces.Host == "" {
				if agentResponse.Upload.Host != nil {
					filePieces.Host = strings.ToUpper(*agentResponse.Upload.Host)
				} else {
					filePieces.Host = task.Callback.Host
				}
			}
			if !fileMeta.TaskID.Valid || fileMeta.TaskID.Int64 != int64(task.ID) {
				// this was uploaded manually through the file hosting and not part of a task or was uploaded as part of a different task
				// either way, we need to make a new fileMeta tracker for it
				newFileMeta := fileMeta
				newFileMeta.TaskID.Int64 = int64(task.ID)
				newFileMeta.TaskID.Valid = true
				newFileMeta.FullRemotePath = []byte(*agentResponse.Upload.FullPath)
				newFileMeta.Filename = []byte(filePieces.PathPieces[len(filePieces.PathPieces)-1])
				newFileMeta.AgentFileID = uuid.NewString()
				newFileMeta.Host = filePieces.Host
				if statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,chunk_size,"path",operation_id,complete,comment,operator_id,delete_after_fetch,md5,sha1,agent_file_id,full_remote_path,task_id,is_download_from_agent,is_screenshot,host)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :full_remote_path, :task_id, :is_download_from_agent, :is_screenshot, :host)
			RETURNING id`); err != nil {
					logging.LogError(err, "Failed to insert new filemeta data for a separate task pulling down an already uploaded file")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to insert new filemeta data for a separate task pulling down an already uploaded file: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				} else if err = statement.Get(&newFileMeta, newFileMeta); err != nil {
					logging.LogError(err, "Failed to insert net filemeta data for a separate task")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to insert new filemeta data for a separate task pulling down an already uploaded file: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				} else {
					go EmitFileLog(newFileMeta.ID)
					go associateFileMetaWithMythicTree(filePieces, newFileMeta, task)
				}
			} else {
				// this might be a new full path for the current file meta that we need to update
				fileMeta.FullRemotePath = []byte(*agentResponse.Upload.FullPath)
				fileMeta.Filename = []byte(filePieces.PathPieces[len(filePieces.PathPieces)-1])
				fileMeta.Host = filePieces.Host
				if _, err := database.DB.NamedExec(`UPDATE filemeta 
					SET full_remote_path=:full_remote_path, filename=:filename, host=:host
					WHERE id=:id`, fileMeta); err != nil {
					logging.LogError(err, "Failed to update filemeta path/filename/host ")
					go SendAllOperationsMessage(fmt.Sprintf("Failed to insert new filemeta data for a separate task pulling down an already uploaded file: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				} else {
					go EmitFileLog(fileMeta.ID)
					go associateFileMetaWithMythicTree(filePieces, fileMeta, task)
				}
			}
		}
	}
	// delete file if delete after fetch is set and chunk_num == total_chunks -1
	if fileMeta.DeleteAfterFetch {
		if uploadResponse.TotalChunks-1 == uploadResponse.ChunkNum {
			// we need to delete the file from the server and mark it as such
			fileMeta.Deleted = true
			if _, err := database.DB.NamedExec(`UPDATE filemeta SET deleted=:deleted WHERE id=:id`, fileMeta); err != nil {
				logging.LogError(err, "Failed to mark file as deleted after successful fetch")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to mark file as deleted after successful fetch: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
			} else if err := os.RemoveAll(fileMeta.Path); err != nil {
				logging.LogError(err, "Failed to delete file after successful fetch")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to delete file after successful fetch: %s\n", *agentResponse.Upload.FileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
			}
		}
	}
}
func associateFileMetaWithMythicTree(pathData utils.AnalyzedPath, fileMeta databaseStructs.Filemeta, task databaseStructs.Task) {
	resolveAndCreateParentPathsForTreeNode(pathData, task, databaseStructs.TREE_TYPE_FILE)
	newTree := databaseStructs.MythicTree{
		Host:            pathData.Host,
		TaskID:          task.ID,
		OperationID:     task.OperationID,
		FullPath:        fileMeta.FullRemotePath,
		TreeType:        databaseStructs.TREE_TYPE_FILE,
		CanHaveChildren: false,
		Deleted:         false,
	}
	parentPath, _, name := getParentPathFullPathName(pathData, len(pathData.PathPieces)-1, databaseStructs.TREE_TYPE_FILE)
	newTree.ParentPath = []byte(parentPath)
	newTree.Name = []byte(name)
	newTree.Success.Valid = true
	newTree.Success.Bool = true
	fileMetaData := map[string]interface{}{
		"access_time": time.Now().Unix(),
		"modify_time": time.Now().Unix(),
		"size":        fileMeta.ChunkSize * fileMeta.TotalChunks,
		"permissions": map[string]interface{}{},
	}
	newTree.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
	createTreeNode(&newTree)
	if newTree.ID == 0 {
		logging.LogError(nil, "Failed to create new tree entry")
		return
	}
	// now that we know the mythictree entry exists, associate this filemeta with it
	fileMeta.MythicTreeID.Valid = true
	fileMeta.MythicTreeID.Int64 = int64(newTree.ID)
	if _, err := database.DB.NamedExec(`UPDATE filemeta SET mythictree_id=:mythictree_id WHERE id=:id`, fileMeta); err != nil {
		logging.LogError(err, "Failed to associate filemeta with mythictree ")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to associate file with file browser: %s\n", fileMeta.AgentFileID), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
	}
}
func addFilePermissions(fileBrowser *agentMessagePostResponseFileBrowser) map[string]interface{} {
	fileMetaData := map[string]interface{}{
		"access_time": fileBrowser.AccessTime,
		"modify_time": fileBrowser.ModifyTime,
		"size":        fileBrowser.Size,
	}
	switch x := fileBrowser.Permissions.(type) {
	case []interface{}:
		fileMetaData["permissions"] = x
	case map[string]interface{}:
		fileMetaData["permissions"] = []interface{}{x}
	case nil:
		fileMetaData["permissions"] = []interface{}{}
	default:
		fileMetaData["permissions"] = []interface{}{}
		logging.LogError(nil, "Unknown permissions type", "data", fileBrowser.Permissions)
	}
	return fileMetaData
}
func addChildFilePermissions(fileBrowser *agentMessagePostResponseFileBrowserChildren) map[string]interface{} {
	fileMetaData := map[string]interface{}{
		"access_time": fileBrowser.AccessTime,
		"modify_time": fileBrowser.ModifyTime,
		"size":        fileBrowser.Size,
	}
	switch x := fileBrowser.Permissions.(type) {
	case []interface{}:
		fileMetaData["permissions"] = x
	case map[string]interface{}:
		fileMetaData["permissions"] = []interface{}{x}
	case nil:
		fileMetaData["permissions"] = []interface{}{}
	default:
		logging.LogError(nil, "Unknown permissions type", "data", fileBrowser.Permissions)
	}
	return fileMetaData
}
func handleAgentMessagePostResponseFileBrowser(task databaseStructs.Task, fileBrowser *agentMessagePostResponseFileBrowser) error {
	// given a FileBrowser object, need to insert it into database and potentially insert parents along the way
	if pathData, err := utils.SplitFilePathGetHost(fileBrowser.ParentPath, fileBrowser.Name, []string{}); err != nil {
		logging.LogError(err, "Failed to add data for file browser due to path issue")
		go SendAllOperationsMessage(err.Error(), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
		return err
	} else {
		if pathData.Host == "" {
			pathData.Host = strings.ToUpper(task.Callback.Host)
		}
		if fileBrowser.Host != "" {
			pathData.Host = strings.ToUpper(fileBrowser.Host)
		}
		go resolveAndCreateParentPathsForTreeNode(pathData, task, databaseStructs.TREE_TYPE_FILE)
		// now that the parents and all ancestors are resolved, process the current path and all children
		realParentPath := strings.Join(pathData.PathPieces, pathData.PathSeparator)
		// check for the instance of // as a leading path
		if len(realParentPath) > 2 {
			if realParentPath[0] == '/' && realParentPath[1] == '/' {
				realParentPath = realParentPath[1:]
			}
		}
		if fileBrowser.Name == "" {
			logging.LogError(nil, "Can't create file browser entry with empty name")
			return errors.New("can't make file browser entry with empty name")
		}
		fullPath := treeNodeGetFullPath(
			[]byte(realParentPath),
			[]byte(fileBrowser.Name),
			[]byte(pathData.PathSeparator),
			databaseStructs.TREE_TYPE_FILE)
		parentPath := treeNodeGetFullPath([]byte(realParentPath), []byte(""), []byte(pathData.PathSeparator), databaseStructs.TREE_TYPE_FILE)
		name := treeNodeGetFullPath([]byte(""), []byte(fileBrowser.Name), []byte(pathData.PathSeparator), databaseStructs.TREE_TYPE_FILE)
		//logging.LogInfo("creating info for listed entry", "name", fileBrowser.Name, "parent", fileBrowser.ParentPath, "fullPath", fullPath, "adjustedParentPath", parentPath)
		newTree := databaseStructs.MythicTree{
			Host:            pathData.Host,
			TaskID:          task.ID,
			OperationID:     task.OperationID,
			Name:            name,
			ParentPath:      parentPath,
			FullPath:        fullPath,
			TreeType:        databaseStructs.TREE_TYPE_FILE,
			CanHaveChildren: !fileBrowser.IsFile,
			Deleted:         false,
			Os:              getOSTypeBasedOnPathSeparator(pathData.PathSeparator, databaseStructs.TREE_TYPE_FILE),
		}
		newTree.Success.Valid = true
		newTree.Success.Bool = fileBrowser.Success
		fileMetaData := addFilePermissions(fileBrowser)
		newTree.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
		createTreeNode(&newTree)
		if fileBrowser.UpdateDeleted != nil && *fileBrowser.UpdateDeleted {
			// we need to iterate over the children for this entry and potentially remove any that the database know of but that aren't in our `files` list
			var existingTreeEntries []databaseStructs.MythicTree
			if err = database.DB.Select(&existingTreeEntries, `SELECT 
    			id, "name", success, full_path, parent_path, operation_id, host, tree_type
				FROM mythictree WHERE
				parent_path=$1 AND operation_id=$2 AND host=$3 AND tree_type=$4`,
				fullPath, task.OperationID, pathData.Host, databaseStructs.TREE_TYPE_FILE); err != nil {
				logging.LogError(err, "Failed to fetch existing children")
				return err
			} else {
				var namesToDeleteAndUpdate []string // will get existing database IDs for things that aren't in the files list
				for _, existingEntry := range existingTreeEntries {
					if fileBrowser.Files != nil {
						existingEntryStillExists := false
						for _, newEntry := range *fileBrowser.Files {
							if bytes.Equal([]byte(newEntry.Name), existingEntry.Name) {
								namesToDeleteAndUpdate = append(namesToDeleteAndUpdate, newEntry.Name)
								existingEntryStillExists = true
								// update the entry in the database
								newTreeChild := databaseStructs.MythicTree{
									Host:            pathData.Host,
									TaskID:          task.ID,
									OperationID:     task.OperationID,
									Name:            []byte(newEntry.Name),
									ParentPath:      existingEntry.ParentPath,
									FullPath:        existingEntry.FullPath,
									TreeType:        databaseStructs.TREE_TYPE_FILE,
									CanHaveChildren: !newEntry.IsFile,
									Deleted:         false,
									Success:         existingEntry.Success,
									ID:              existingEntry.ID,
									Os:              newTree.Os,
								}
								fileMetaData = addChildFilePermissions(&newEntry)
								newTreeChild.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
								updateTreeNode(newTreeChild)
							}
						}
						if !existingEntryStillExists {
							namesToDeleteAndUpdate = append(namesToDeleteAndUpdate, string(existingEntry.Name))
							existingEntry.Deleted = true
							deleteTreeNode(existingEntry, true)
						}
					}

				}
				// now all existing ones have been updated or deleted, so it's time to add new ones
				if fileBrowser.Files != nil {
					for _, newEntry := range *fileBrowser.Files {
						if !utils.SliceContains(namesToDeleteAndUpdate, newEntry.Name) {
							// this isn't marked as updated or deleted, so let's create it
							newTreeChild := databaseStructs.MythicTree{
								Host:            pathData.Host,
								TaskID:          task.ID,
								OperationID:     task.OperationID,
								Name:            []byte(newEntry.Name),
								ParentPath:      fullPath,
								TreeType:        databaseStructs.TREE_TYPE_FILE,
								CanHaveChildren: !newEntry.IsFile,
								Deleted:         false,
								Os:              newTree.Os,
							}
							newTreeChild.FullPath = treeNodeGetFullPath(fullPath, []byte(newEntry.Name), []byte(pathData.PathSeparator), databaseStructs.TREE_TYPE_FILE)
							fileMetaData = addChildFilePermissions(&newEntry)
							newTreeChild.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
							createTreeNode(&newTreeChild)
						}
					}
				}

			}
		} else if fileBrowser.Files != nil {
			// we're not automatically updating deleted children, so just iterate over the files and insert/update them
			for _, newEntry := range *fileBrowser.Files {
				newTreeChild := databaseStructs.MythicTree{
					Host:            pathData.Host,
					TaskID:          task.ID,
					OperationID:     task.OperationID,
					Name:            []byte(newEntry.Name),
					ParentPath:      fullPath,
					TreeType:        databaseStructs.TREE_TYPE_FILE,
					CanHaveChildren: !newEntry.IsFile,
					Deleted:         false,
					Os:              newTree.Os,
				}
				newTreeChild.FullPath = treeNodeGetFullPath(fullPath, []byte(newEntry.Name), []byte(pathData.PathSeparator), databaseStructs.TREE_TYPE_FILE)
				fileMetaData = addChildFilePermissions(&newEntry)
				newTreeChild.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
				createTreeNode(&newTreeChild)
			}
		}
	}
	return nil
}
func handleAgentMessagePostResponseProcesses(task databaseStructs.Task, processes *[]agentMessagePostResponseProcesses) error {
	// process data is also represented in a tree format with a full path of the process_id
	updateDeleted := false
	for indx, _ := range *processes {
		if (*processes)[indx].UpdateDeleted != nil && *(*processes)[indx].UpdateDeleted {
			updateDeleted = true
		}
	}
	if len(*processes) == 0 {
		return nil
	}
	// Get the host (default to callback.Host if per-process host not specified)
	host := task.Callback.Host
	if (*processes)[0].Host != nil && *(*processes)[0].Host != "" {
		host = strings.ToUpper(*(*processes)[0].Host)
	}
	if updateDeleted {
		var existingTreeEntries []databaseStructs.MythicTree
		if err := database.DB.Select(&existingTreeEntries, `SELECT 
    			id, "name", success, full_path, parent_path, operation_id, host, tree_type
				FROM mythictree WHERE
				operation_id=$1 AND host=$2 AND tree_type=$3`,
			task.OperationID, host, databaseStructs.TREE_TYPE_PROCESS); err != nil {
			logging.LogError(err, "Failed to fetch existing children")
			return err
		} else {
			// we have all the current processes for that host, track which ones need updating/deleting
			var namesToDeleteAndUpdate []string // will get existing database IDs for things that aren't in the files list
			for _, existingEntry := range existingTreeEntries {
				existingEntryStillExists := false
				for _, newEntry := range *processes {
					if strconv.Itoa(newEntry.ProcessID) == string(existingEntry.FullPath) &&
						newEntry.Name == string(existingEntry.Name) &&
						strconv.Itoa(newEntry.ParentProcessID) == string(existingEntry.ParentPath) {
						namesToDeleteAndUpdate = append(namesToDeleteAndUpdate, strconv.Itoa(newEntry.ProcessID))
						existingEntryStillExists = true
						// update the entry in the database
						parentPath := strconv.Itoa(newEntry.ParentProcessID)
						if newEntry.ParentProcessID <= 0 {
							parentPath = ""
						}
						fullPath := treeNodeGetFullPath(
							[]byte(parentPath),
							[]byte(strconv.Itoa(newEntry.ProcessID)),
							[]byte("/"),
							databaseStructs.TREE_TYPE_PROCESS)
						newTree := databaseStructs.MythicTree{
							Host:            host,
							TaskID:          task.ID,
							OperationID:     task.OperationID,
							Name:            []byte(newEntry.Name),
							ParentPath:      []byte(parentPath),
							FullPath:        fullPath,
							TreeType:        databaseStructs.TREE_TYPE_PROCESS,
							CanHaveChildren: true,
							Deleted:         false,
						}
						if newEntry.OS != nil {
							newTree.Os = *newEntry.OS
						} else {
							newTree.Os = task.Callback.Payload.Os
						}
						metadata := map[string]interface{}{
							"process_id":              newEntry.ProcessID,
							"parent_process_id":       newEntry.ParentProcessID,
							"architecture":            newEntry.Architecture,
							"bin_path":                newEntry.BinPath,
							"name":                    newEntry.Name,
							"user":                    newEntry.User,
							"command_line":            newEntry.CommandLine,
							"integrity_level":         newEntry.IntegrityLevel,
							"start_time":              newEntry.StartTime,
							"description":             newEntry.Description,
							"signer":                  newEntry.Signer,
							"protected_process_level": newEntry.ProtectionProcessLevel,
						}
						reflectBackOtherKeys(&metadata, &newEntry.Other)
						newTree.Metadata = GetMythicJSONTextFromStruct(metadata)
						createTreeNode(&newTree)
					}
				}
				if !existingEntryStillExists {
					// full path is just the string of the PID
					namesToDeleteAndUpdate = append(namesToDeleteAndUpdate, string(existingEntry.FullPath))
					existingEntry.Deleted = true
					deleteTreeNode(existingEntry, false)
				}

			}
			// now all existing ones have been updated or deleted, so it's time to add new ones

			for _, newEntry := range *processes {
				if !utils.SliceContains(namesToDeleteAndUpdate, strconv.Itoa(newEntry.ProcessID)) {
					// this isn't marked as updated or deleted, so let's create it
					parentPath := strconv.Itoa(newEntry.ParentProcessID)
					if newEntry.ParentProcessID <= 0 {
						parentPath = ""
					}
					fullPath := treeNodeGetFullPath(
						[]byte(parentPath),
						[]byte(strconv.Itoa(newEntry.ProcessID)),
						[]byte("/"),
						databaseStructs.TREE_TYPE_PROCESS)
					newTree := databaseStructs.MythicTree{
						Host:            host,
						TaskID:          task.ID,
						OperationID:     task.OperationID,
						Name:            []byte(newEntry.Name),
						ParentPath:      []byte(parentPath),
						FullPath:        fullPath,
						TreeType:        databaseStructs.TREE_TYPE_PROCESS,
						CanHaveChildren: true,
						Deleted:         false,
					}
					if newEntry.OS != nil {
						newTree.Os = *newEntry.OS
					} else {
						newTree.Os = task.Callback.Payload.Os
					}
					metadata := map[string]interface{}{
						"process_id":              newEntry.ProcessID,
						"parent_process_id":       newEntry.ParentProcessID,
						"architecture":            newEntry.Architecture,
						"bin_path":                newEntry.BinPath,
						"name":                    newEntry.Name,
						"user":                    newEntry.User,
						"command_line":            newEntry.CommandLine,
						"integrity_level":         newEntry.IntegrityLevel,
						"start_time":              newEntry.StartTime,
						"description":             newEntry.Description,
						"signer":                  newEntry.Signer,
						"protected_process_level": newEntry.ProtectionProcessLevel,
					}
					reflectBackOtherKeys(&metadata, &newEntry.Other)
					newTree.Metadata = GetMythicJSONTextFromStruct(metadata)
					createTreeNode(&newTree)
				}
			}

		}
	} else {
		for _, newEntry := range *processes {
			host := task.Callback.Host
			if newEntry.Host != nil && *newEntry.Host != "" {
				host = strings.ToUpper(*newEntry.Host)
			}
			// can't pre-create parent entries since that info isn't known
			parentPath := strconv.Itoa(newEntry.ParentProcessID)
			if newEntry.ParentProcessID <= 0 {
				parentPath = ""
			}
			fullPath := treeNodeGetFullPath(
				[]byte(parentPath),
				[]byte(strconv.Itoa(newEntry.ProcessID)),
				[]byte("/"),
				databaseStructs.TREE_TYPE_PROCESS)
			newTree := databaseStructs.MythicTree{
				Host:            host,
				TaskID:          task.ID,
				OperationID:     task.OperationID,
				Name:            []byte(newEntry.Name),
				ParentPath:      []byte(parentPath),
				FullPath:        fullPath,
				TreeType:        databaseStructs.TREE_TYPE_PROCESS,
				CanHaveChildren: true,
				Deleted:         false,
			}
			if newEntry.OS != nil {
				newTree.Os = *newEntry.OS
			} else {
				newTree.Os = task.Callback.Payload.Os
			}
			metadata := map[string]interface{}{
				"process_id":              newEntry.ProcessID,
				"parent_process_id":       newEntry.ParentProcessID,
				"architecture":            newEntry.Architecture,
				"bin_path":                newEntry.BinPath,
				"name":                    newEntry.Name,
				"user":                    newEntry.User,
				"command_line":            newEntry.CommandLine,
				"integrity_level":         newEntry.IntegrityLevel,
				"start_time":              newEntry.StartTime,
				"description":             newEntry.Description,
				"signer":                  newEntry.Signer,
				"protected_process_level": newEntry.ProtectionProcessLevel,
			}
			reflectBackOtherKeys(&metadata, &newEntry.Other)
			newTree.Metadata = GetMythicJSONTextFromStruct(metadata)
			createTreeNode(&newTree)
		}
	}

	return nil
}
func resolveAndCreateParentPathsForTreeNode(pathData utils.AnalyzedPath, task databaseStructs.Task, treeType string) {
	for i, _ := range pathData.PathPieces {
		parentPath, fullPath, name := getParentPathFullPathName(pathData, i, databaseStructs.TREE_TYPE_FILE)

		newTree := databaseStructs.MythicTree{
			Host:            pathData.Host,
			TaskID:          task.ID,
			OperationID:     task.OperationID,
			Name:            []byte(name),
			FullPath:        []byte(fullPath),
			ParentPath:      []byte(parentPath),
			TreeType:        treeType,
			CanHaveChildren: true,
			Deleted:         false,
		}
		newTree.Os = getOSTypeBasedOnPathSeparator(pathData.PathSeparator, treeType)
		createTreeNode(&newTree)
	}
}
func getOSTypeBasedOnPathSeparator(pathSeparator string, treeType string) string {
	switch treeType {
	case databaseStructs.TREE_TYPE_FILE:
		if pathSeparator == "/" {
			return "linux"
		} else {
			return "windows"
		}
	default:
		return "linux"
	}
}
func treeNodeGetFullPath(parentPath []byte, name []byte, pathSeparator []byte, treeType string) []byte {
	switch treeType {
	case databaseStructs.TREE_TYPE_FILE:
		fullPath := parentPath
		// if parent path is empty, then we don't want to add an extra instance of the path separator
		if len(fullPath) > 0 {
			if fullPath[len(fullPath)-1] == pathSeparator[len(pathSeparator)-1] {
			} else if !bytes.Equal(fullPath, []byte("/")) {
				fullPath = append(fullPath, pathSeparator...)
			}
		}
		fullPath = append(fullPath, name...)
		//logging.LogInfo("getting full path", "fullPath", fullPath, "parentPath", parentPath, "name", name)
		if len(fullPath) > 1 {
			if fullPath[len(fullPath)-1] == pathSeparator[len(pathSeparator)-1] {
				fullPath = fullPath[:len(fullPath)-1]
			}
		}
		return fullPath

	case databaseStructs.TREE_TYPE_PROCESS:
		// full path is just the process_id of the current process
		return name
	default:
		return nil
	}
}
func getParentPathFullPathName(pathData utils.AnalyzedPath, endIndex int, treeType string) (string, string, string) {
	var parentPath string
	var fullPath string
	var name string
	switch treeType {
	case databaseStructs.TREE_TYPE_FILE:
		if endIndex == 0 {
			// this is the root node, so we're looking for name=name, parent_path="", full_path=name
			fullPath = pathData.PathPieces[endIndex]
			parentPath = ""
			name = pathData.PathPieces[endIndex]
		} else {
			// parent_path is the joint of everything up to i except for i
			if pathData.PathSeparator == "/" {
				parentPath = strings.Join(pathData.PathPieces[:endIndex], pathData.PathSeparator)
				if len(parentPath) > 1 {
					parentPath = parentPath[1:]
				}
				fullPath = strings.Join(pathData.PathPieces[:endIndex+1], pathData.PathSeparator)
				if len(fullPath) > 1 {
					fullPath = fullPath[1:]
				}

			} else {
				parentPath = strings.Join(pathData.PathPieces[:endIndex], pathData.PathSeparator)
				fullPath = strings.Join(pathData.PathPieces[:endIndex+1], pathData.PathSeparator)
			}
			name = pathData.PathPieces[endIndex]
		}
		//logging.LogInfo("getting path info", "parentPath", parentPath, "fullPath", fullPath, "name", name)
		return parentPath, fullPath, name
	default:
		logging.LogError(nil, "Unknown mythictree type", "tree type", treeType)
		return "", "", ""
	}
}
func updateTreeNode(treeNode databaseStructs.MythicTree) {
	if _, err := database.DB.NamedExec(`UPDATE mythictree SET
        success=:success, deleted=:deleted, metadata=:metadata, task_id=:task_id
		WHERE id=:id
`, treeNode); err != nil {
		logging.LogError(err, "Failed to update tree node")
	}
}
func deleteTreeNode(treeNode databaseStructs.MythicTree, cascade bool) {
	if cascade {
		// we want to delete this node and all nodes that are children of it
		treeNode.FullPath = append(treeNode.FullPath, byte('%'))
		if _, err := database.DB.NamedExec(`UPDATE mythictree SET
		  deleted=true 
		  WHERE host=:host AND operation_id=:operation_id AND tree_type=:tree_type AND
		        parent_path LIKE :full_path
		   `, treeNode); err != nil {
			logging.LogError(err, "Failed to mark all children as deleted in tree")
		}
	}
	// we just want to delete this specific node
	if _, err := database.DB.NamedExec(`UPDATE mythictree SET
        deleted=:deleted
		WHERE id=:id`, treeNode); err != nil {
		logging.LogError(err, "Failed to update tree node")
	}
}
func createTreeNode(treeNode *databaseStructs.MythicTree) {
	if len(treeNode.Name) == 0 {
		logging.LogError(nil, "Can't create file browser entry with empty name")
		return
	}
	if statement, err := database.DB.PrepareNamed(`INSERT INTO mythictree
		(host, task_id, operation_id, "name", full_path, parent_path, tree_type, can_have_children, success, metadata, os) 
		VALUES 
		(:host, :task_id, :operation_id, :name, :full_path, :parent_path, :tree_type, :can_have_children, :success, :metadata, :os)
		ON CONFLICT (host, operation_id, full_path, tree_type)
		DO UPDATE SET
		task_id=:task_id, "name"=:name, parent_path=:parent_path, can_have_children=:can_have_children,
		    metadata=:metadata, os=:os, "timestamp"=now(), deleted=false
		    RETURNING id`); err != nil {
		logging.LogError(err, "Failed to create new mythictree statement")
	} else if err = statement.Get(&treeNode.ID, treeNode); err != nil {
		logging.LogError(err, "Failed to create new mythictree entry")
	}
}
func addFileMetaToMythicTree(task databaseStructs.Task, newFile databaseStructs.Filemeta) {
	fileBrowser := databaseStructs.MythicTree{}
	if err := database.DB.Get(&fileBrowser, `SELECT id FROM mythictree WHERE
		operation_id=$1 AND full_path=$2 AND tree_type='file'`,
		newFile.OperationID, newFile.FullRemotePath); err == sql.ErrNoRows {
		if pathData, err := utils.SplitFilePathGetHost(string(newFile.FullRemotePath), "", []string{}); err != nil {
			logging.LogError(err, "Failed to add data for file browser due to path issue")
			go SendAllOperationsMessage(err.Error(), task.OperationID, "", database.MESSAGE_LEVEL_WARNING)
		} else {
			if pathData.Host == "" {
				pathData.Host = strings.ToUpper(task.Callback.Host)
			}
			resolveAndCreateParentPathsForTreeNode(pathData, task, databaseStructs.TREE_TYPE_FILE)
			if err := database.DB.Get(&fileBrowser, `SELECT id FROM mythictree WHERE
				operation_id=$1 AND full_path=$2 AND tree_type='file'`,
				newFile.OperationID, newFile.FullRemotePath); err != nil {
				logging.LogError(err, "Failed to find, create, and then fine mythic tree data for newly downloaded file")
			} else {
				newFile.MythicTreeID.Int64 = int64(fileBrowser.ID)
				newFile.MythicTreeID.Valid = true
				if _, err := database.DB.NamedExec(`UPDATE filemeta SET mythictree_id=:mythictree_id WHERE id=:id`, newFile); err != nil {
					logging.LogError(err, "Failed to update file meta with mythic tree id")
				} else if _, err := database.DB.Exec(`UPDATE mythictree SET can_have_children=false WHERE id=$1`, fileBrowser.ID); err != nil {
					logging.LogError(err, "Failed to update browser object to file instead of folder")
				}
			}
		}
	} else if err == nil {
		newFile.MythicTreeID.Int64 = int64(fileBrowser.ID)
		newFile.MythicTreeID.Valid = true
		if _, err := database.DB.NamedExec(`UPDATE filemeta SET mythictree_id=:mythictree_id WHERE id=:id`, newFile); err != nil {
			logging.LogError(err, "Failed to update file meta with mythic tree id")
		}

	} else {
		logging.LogError(err, "failed to search for file browser data")
	}
}
func handleAgentMessagePostResponseEdges(edges *[]agentMessagePostResponseEdges) {
	if edges != nil {
		for _, edge := range *edges {
			if edge.Action == "add" {
				callbackGraph.AddByAgentIds(edge.Source, edge.Destination, edge.C2Profile)
			} else {
				callbackGraph.RemoveByAgentIds(edge.Source, edge.Destination, edge.C2Profile)
			}
		}
	}
}
func handleAgentMessagePostResponseAlerts(operationID int, alerts *[]agentMessagePostResponseAlert) {
	if alerts == nil {
		return
	}
	for _, alert := range *alerts {
		source := ""
		if alert.Source != nil {
			source = *alert.Source
		}
		SendAllOperationsMessage(alert.Alert, operationID, source, database.MESSAGE_LEVEL_WARNING)
	}
}
