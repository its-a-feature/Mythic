package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

const (
	credentialValidityMetadataKey = "validity"
	credentialValidityTagSource   = "credential-validity"
)

var credentialValidityTagDefinitions = []struct {
	Name        string
	Color       string
	Description string
	Active      func(credentialValidityEvaluation) bool
}{
	{
		Name:        "credential:not-yet-valid",
		Color:       "#7c3aed",
		Description: "Credential lifecycle metadata indicates this credential is not valid yet.",
		Active: func(e credentialValidityEvaluation) bool {
			return e.NotYetValid
		},
	},
	{
		Name:        "credential:expired",
		Color:       "#dc2626",
		Description: "Credential lifecycle metadata indicates this credential is expired.",
		Active: func(e credentialValidityEvaluation) bool {
			return e.Expired
		},
	},
	{
		Name:        "credential:renew-expired",
		Color:       "#f59e0b",
		Description: "Credential lifecycle metadata indicates this credential is past its renew-until time.",
		Active: func(e credentialValidityEvaluation) bool {
			return e.RenewExpired
		},
	},
}

type credentialValidityEvaluation struct {
	HasLifecycle     bool
	NotBefore        *time.Time
	ExpiresAt        *time.Time
	RenewUntil       *time.Time
	NotYetValid      bool
	Expired          bool
	RenewExpired     bool
	Valid            bool
	NextTransitionAt *time.Time
}

type credentialValidityEntry struct {
	ID          int
	OperationID int
	Timer       *time.Timer
}

type credentialValidityManager struct {
	sync.Mutex
	entries map[int]*credentialValidityEntry
	tagLock sync.Mutex
}

var CredentialValidityManager = &credentialValidityManager{
	entries: make(map[int]*credentialValidityEntry),
}

func InitializeCredentialValidityManager() {
	CredentialValidityManager.Initialize()
}

func RefreshCredentialValidity(credentialID int) {
	CredentialValidityManager.Refresh(credentialID)
}

func (m *credentialValidityManager) Initialize() {
	credentialsWithLifecycle := []databaseStructs.Credential{}
	err := database.DB.Select(&credentialsWithLifecycle, `SELECT id, operation_id, metadata
		FROM credential
		WHERE deleted=false
		AND (metadata ? 'not_before' OR metadata ? 'expires_at' OR metadata ? 'renew_until')`)
	if err != nil {
		logging.LogError(err, "Failed to initialize credential validity manager")
		return
	}
	for _, credential := range credentialsWithLifecycle {
		m.trackCredential(credential)
	}
	logging.LogInfo("Credential validity manager initialized", "credentials_tracked", len(credentialsWithLifecycle))
}

func (m *credentialValidityManager) Refresh(credentialID int) {
	credential := databaseStructs.Credential{}
	err := database.DB.Get(&credential, `SELECT id, operation_id, metadata
		FROM credential
		WHERE id=$1 AND deleted=false`, credentialID)
	if errors.Is(err, sql.ErrNoRows) {
		m.Forget(credentialID)
		return
	}
	if err != nil {
		logging.LogError(err, "Failed to refresh credential validity", "credential_id", credentialID)
		return
	}
	m.trackCredential(credential)
}

func (m *credentialValidityManager) Forget(credentialID int) {
	m.Lock()
	operationID := 0
	if entry, ok := m.entries[credentialID]; ok {
		operationID = entry.OperationID
		if entry.Timer != nil {
			entry.Timer.Stop()
		}
		delete(m.entries, credentialID)
	}
	m.Unlock()
	if operationID == 0 {
		_ = database.DB.Get(&operationID, `SELECT operation_id FROM credential WHERE id=$1`, credentialID)
	}
	if operationID > 0 {
		m.removeValidityTags(credentialID, operationID)
	}
}

func (m *credentialValidityManager) trackCredential(credential databaseStructs.Credential) {
	metadata := credential.Metadata.StructValue()
	evaluation := applyCredentialValidityToMetadata(metadata, time.Now().UTC())
	if !evaluation.HasLifecycle {
		m.Forget(credential.ID)
		return
	}
	newMetadata := GetMythicJSONTextFromStruct(metadata)
	if !mythicJSONTextEqual(credential.Metadata, newMetadata) {
		if _, err := database.DB.Exec(`UPDATE credential SET metadata=$1 WHERE id=$2`, newMetadata, credential.ID); err != nil {
			logging.LogError(err, "Failed to persist credential validity metadata", "credential_id", credential.ID)
		}
	}
	m.syncValidityTags(credential.ID, credential.OperationID, evaluation)
	m.scheduleCredential(credential.ID, credential.OperationID, evaluation)
}

func (m *credentialValidityManager) scheduleCredential(credentialID int, operationID int, evaluation credentialValidityEvaluation) {
	m.Lock()
	defer m.Unlock()
	if entry, ok := m.entries[credentialID]; ok && entry.Timer != nil {
		entry.Timer.Stop()
	}
	entry := &credentialValidityEntry{
		ID:          credentialID,
		OperationID: operationID,
	}
	if evaluation.NextTransitionAt != nil {
		delay := time.Until(*evaluation.NextTransitionAt)
		if delay < time.Second {
			delay = time.Second
		}
		entry.Timer = time.AfterFunc(delay, func() {
			m.Refresh(credentialID)
		})
	}
	m.entries[credentialID] = entry
}

func (m *credentialValidityManager) syncValidityTags(credentialID int, operationID int, evaluation credentialValidityEvaluation) {
	for _, definition := range credentialValidityTagDefinitions {
		tagTypeID, err := m.getOrCreateCredentialValidityTagType(operationID, definition.Name, definition.Color, definition.Description)
		if err != nil {
			logging.LogError(err, "Failed to get or create credential validity tag type", "credential_id", credentialID, "tag", definition.Name)
			continue
		}
		if definition.Active(evaluation) {
			if err := upsertCredentialValidityTag(credentialID, operationID, tagTypeID, evaluation); err != nil {
				logging.LogError(err, "Failed to upsert credential validity tag", "credential_id", credentialID, "tag", definition.Name)
			}
		} else if _, err := database.DB.Exec(`DELETE FROM tag
			WHERE credential_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source=$4`,
			credentialID, operationID, tagTypeID, credentialValidityTagSource); err != nil {
			logging.LogError(err, "Failed to delete inactive credential validity tag", "credential_id", credentialID, "tag", definition.Name)
		}
	}
}

func (m *credentialValidityManager) removeValidityTags(credentialID int, operationID int) {
	for _, definition := range credentialValidityTagDefinitions {
		tagTypeID, found, err := getCredentialValidityTagType(operationID, definition.Name)
		if err != nil {
			logging.LogError(err, "Failed to get credential validity tag type for cleanup", "credential_id", credentialID, "tag", definition.Name)
			continue
		}
		if !found {
			continue
		}
		if _, err := database.DB.Exec(`DELETE FROM tag
			WHERE credential_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source=$4`,
			credentialID, operationID, tagTypeID, credentialValidityTagSource); err != nil {
			logging.LogError(err, "Failed to delete credential validity tag during cleanup", "credential_id", credentialID, "tag", definition.Name)
		}
	}
}

func getCredentialValidityTagType(operationID int, name string) (int, bool, error) {
	tagType := databaseStructs.TagType{}
	if err := database.DB.Get(&tagType, `SELECT id FROM tagtype WHERE operation_id=$1 AND name=$2`, operationID, name); errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	} else if err != nil {
		return 0, false, err
	}
	return tagType.ID, true, nil
}

func (m *credentialValidityManager) getOrCreateCredentialValidityTagType(operationID int, name string, color string, description string) (int, error) {
	m.tagLock.Lock()
	defer m.tagLock.Unlock()
	tagType := databaseStructs.TagType{}
	if err := database.DB.Get(&tagType, `SELECT id FROM tagtype WHERE operation_id=$1 AND name=$2`, operationID, name); err == nil {
		return tagType.ID, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	if err := database.DB.Get(&tagType.ID, `INSERT INTO tagtype
		(name, color, description, operation_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id`, name, color, description, operationID); err != nil {
		return 0, err
	}
	return tagType.ID, nil
}

func upsertCredentialValidityTag(credentialID int, operationID int, tagTypeID int, evaluation credentialValidityEvaluation) error {
	data := GetMythicJSONTextFromStruct(map[string]interface{}{
		"credential_id": credentialID,
		"validity":      credentialValidityMetadata(evaluation, time.Now().UTC()),
		"updated_at":    time.Now().UTC().Format(time.RFC3339),
	})
	tag := databaseStructs.Tag{}
	if err := database.DB.Get(&tag, `SELECT id FROM tag
		WHERE credential_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source=$4`,
		credentialID, operationID, tagTypeID, credentialValidityTagSource); errors.Is(err, sql.ErrNoRows) {
		_, insertErr := database.DB.Exec(`INSERT INTO tag
			(tagtype_id, data, operation_id, source, credential_id)
			VALUES ($1, $2, $3, $4, $5)`,
			tagTypeID, data, operationID, credentialValidityTagSource, credentialID)
		return insertErr
	} else if err != nil {
		return err
	}
	_, err := database.DB.Exec(`UPDATE tag SET data=$1 WHERE id=$2`, data, tag.ID)
	return err
}

func applyCredentialValidityToMetadata(metadata map[string]interface{}, now time.Time) credentialValidityEvaluation {
	evaluation := evaluateCredentialValidity(metadata, now)
	if !evaluation.HasLifecycle {
		return evaluation
	}
	metadata[credentialValidityMetadataKey] = credentialValidityMetadata(evaluation, now)
	return evaluation
}

func evaluateCredentialValidity(metadata map[string]interface{}, now time.Time) credentialValidityEvaluation {
	evaluation := credentialValidityEvaluation{}
	notBefore, hasNotBefore := credentialMetadataTime(metadata["not_before"])
	expiresAt, hasExpiresAt := credentialMetadataTime(metadata["expires_at"])
	renewUntil, hasRenewUntil := credentialMetadataTime(metadata["renew_until"])
	evaluation.HasLifecycle = hasNotBefore || hasExpiresAt || hasRenewUntil
	if !evaluation.HasLifecycle {
		return evaluation
	}
	if hasNotBefore {
		evaluation.NotBefore = &notBefore
		evaluation.NotYetValid = now.Before(notBefore)
	}
	if hasExpiresAt {
		evaluation.ExpiresAt = &expiresAt
		evaluation.Expired = !now.Before(expiresAt)
	}
	if hasRenewUntil {
		evaluation.RenewUntil = &renewUntil
		evaluation.RenewExpired = !now.Before(renewUntil)
	}
	evaluation.Valid = !evaluation.NotYetValid && !evaluation.Expired && !evaluation.RenewExpired
	for _, candidate := range []*time.Time{evaluation.NotBefore, evaluation.ExpiresAt, evaluation.RenewUntil} {
		if candidate == nil || !candidate.After(now) {
			continue
		}
		if evaluation.NextTransitionAt == nil || candidate.Before(*evaluation.NextTransitionAt) {
			next := *candidate
			evaluation.NextTransitionAt = &next
		}
	}
	return evaluation
}

func credentialValidityMetadata(evaluation credentialValidityEvaluation, now time.Time) map[string]interface{} {
	metadata := map[string]interface{}{
		"valid":         evaluation.Valid,
		"not_yet_valid": evaluation.NotYetValid,
		"expired":       evaluation.Expired,
		"renew_expired": evaluation.RenewExpired,
		"checked_at":    now.UTC().Format(time.RFC3339),
		"has_lifecycle": evaluation.HasLifecycle,
	}
	reasons := make([]string, 0)
	if evaluation.NotYetValid {
		reasons = append(reasons, "not_yet_valid")
	}
	if evaluation.Expired {
		reasons = append(reasons, "expired")
	}
	if evaluation.RenewExpired {
		reasons = append(reasons, "renew_expired")
	}
	if len(reasons) > 0 {
		metadata["reasons"] = reasons
	}
	if evaluation.NextTransitionAt != nil {
		metadata["next_transition_at"] = evaluation.NextTransitionAt.UTC().Format(time.RFC3339)
	}
	return metadata
}

func credentialMetadataTime(value interface{}) (time.Time, bool) {
	switch v := value.(type) {
	case time.Time:
		if v.IsZero() {
			return time.Time{}, false
		}
		return v.UTC(), true
	case string:
		return parseCredentialMetadataTimeString(v)
	case []byte:
		return parseCredentialMetadataTimeString(string(v))
	default:
		if v == nil {
			return time.Time{}, false
		}
		return parseCredentialMetadataTimeString(fmt.Sprintf("%v", v))
	}
}

func parseCredentialMetadataTimeString(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05 -0700 MST",
		"2006-01-02 15:04:05",
	} {
		parsed, err := time.Parse(layout, value)
		if err == nil && !parsed.IsZero() {
			return parsed.UTC(), true
		}
	}
	return time.Time{}, false
}

func mythicJSONTextEqual(left databaseStructs.MythicJSONText, right databaseStructs.MythicJSONText) bool {
	var leftValue interface{}
	var rightValue interface{}
	if err := json.Unmarshal([]byte(left), &leftValue); err != nil {
		return false
	}
	if err := json.Unmarshal([]byte(right), &rightValue); err != nil {
		return false
	}
	leftBytes, _ := json.Marshal(leftValue)
	rightBytes, _ := json.Marshal(rightValue)
	return string(leftBytes) == string(rightBytes)
}
