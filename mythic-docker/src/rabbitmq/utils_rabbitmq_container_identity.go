package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/its-a-feature/Mythic/database"
)

func extractPayloadTypeSyncIdentity(body []byte) (string, error) {
	message := struct {
		PayloadType struct {
			Name string `json:"name"`
		} `json:"payload_type"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.PayloadType.Name)
}

func extractC2SyncIdentity(body []byte) (string, error) {
	message := struct {
		C2Profile struct {
			Name string `json:"name"`
		} `json:"c2_profile"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.C2Profile.Name)
}

func extractC2StatusIdentity(body []byte) (string, error) {
	message := struct {
		C2Profile string `json:"c2_profile"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.C2Profile)
}

func extractConsumingContainerSyncIdentity(body []byte) (string, error) {
	message := struct {
		ConsumingContainer struct {
			Name string `json:"name"`
		} `json:"consuming_container"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.ConsumingContainer.Name)
}

func extractTranslationContainerSyncIdentity(body []byte) (string, error) {
	message := struct {
		Name string `json:"name"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.Name)
}

func extractCustomBrowserSyncIdentity(body []byte) (string, error) {
	message := struct {
		CustomBrowser struct {
			Name string `json:"name"`
		} `json:"custombrowser"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.CustomBrowser.Name)
}

func extractContainerOnStartResponseIdentity(body []byte) (string, error) {
	message := struct {
		ContainerName string `json:"container_name"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	return validateClaimedContainerIdentity(message.ContainerName)
}

func extractCommandSearchIdentity(body []byte) (string, error) {
	message := struct {
		PayloadTypeName *string `json:"payload_type_name"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	if message.PayloadTypeName == nil {
		return "", errors.New("payload_type_name is required for container command search")
	}
	return validateClaimedContainerIdentity(*message.PayloadTypeName)
}

func extractPayloadBuildResponseIdentity(body []byte) (string, error) {
	message := struct {
		PayloadUUID string `json:"uuid"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	if message.PayloadUUID == "" {
		return "", errors.New("uuid is required for payload build response")
	}
	return queryOwnedContainerIdentity(`SELECT payloadtype.name
		FROM payload
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
		WHERE payload.uuid = $1`, message.PayloadUUID)
}

func extractTaskResponseIdentity(body []byte) (string, error) {
	message := struct {
		TaskID int `json:"task_id"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	if message.TaskID <= 0 {
		return "", errors.New("task_id is required for task response")
	}
	return queryOwnedContainerIdentity(`SELECT command_payload_type
		FROM task
		WHERE id = $1`, message.TaskID)
}

func extractTaskCompletionResponseIdentity(body []byte) (string, error) {
	message := struct {
		TaskID       int `json:"task_id"`
		ParentTaskID int `json:"parent_task_id"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	if message.TaskID <= 0 {
		return "", errors.New("task_id is required for task completion response")
	}
	if message.ParentTaskID == 0 {
		return queryOwnedContainerIdentity(`SELECT command_payload_type
			FROM task
			WHERE id = $1`, message.TaskID)
	}
	// Completion functions run under the parent command's payload type.
	return queryOwnedContainerIdentity(`SELECT parent.command_payload_type
		FROM task child
		JOIN task parent ON child.parent_task_id = parent.id
		WHERE child.id = $1 AND parent.id = $2`, message.TaskID, message.ParentTaskID)
}

func extractAgentTaskResponseIdentity(body []byte) (string, error) {
	message := struct {
		CallbackID  int    `json:"callback_id"`
		AgentTaskID string `json:"agent_task_id"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	if message.CallbackID <= 0 || message.AgentTaskID == "" {
		return "", errors.New("callback_id and agent_task_id are required for agent task response")
	}
	return queryOwnedContainerIdentity(`SELECT payloadtype.name
		FROM task
		JOIN callback ON task.callback_id = callback.id
		JOIN payload ON callback.registered_payload_id = payload.id
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
		WHERE task.callback_id = $1 AND task.agent_task_id = $2`, message.CallbackID, message.AgentTaskID)
}

func extractOnNewCallbackResponseIdentity(body []byte) (string, error) {
	message := struct {
		AgentCallbackID string `json:"agent_callback_id"`
	}{}
	if err := json.Unmarshal(body, &message); err != nil {
		return "", err
	}
	if message.AgentCallbackID == "" {
		return "", errors.New("agent_callback_id is required for callback response")
	}
	return queryOwnedContainerIdentity(`SELECT payloadtype.name
		FROM callback
		JOIN payload ON callback.registered_payload_id = payload.id
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
		WHERE callback.agent_callback_id = $1`, message.AgentCallbackID)
}

func queryOwnedContainerIdentity(query string, args ...interface{}) (string, error) {
	identity := ""
	if err := database.DB.Get(&identity, query, args...); err != nil {
		return "", fmt.Errorf("resolve target container identity: %w", err)
	}
	return validateClaimedContainerIdentity(identity)
}

func validateClaimedContainerIdentity(identity string) (string, error) {
	if identity == "" {
		return "", errors.New("container identity is empty")
	}
	if !isCanonicalContainerPrincipal(identity) {
		return "", errors.New("container identity is not canonical")
	}
	return identity, nil
}
