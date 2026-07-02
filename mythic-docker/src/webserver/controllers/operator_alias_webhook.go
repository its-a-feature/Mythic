package webcontroller

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type OperatorAliasActionOutput struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
	ID     int    `json:"id,omitempty"`
}

type OperatorAliasExportOutput struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
	Config string `json:"config,omitempty"`
}

type OperatorAliasImportOutput struct {
	Status                string                       `json:"status"`
	Error                 string                       `json:"error,omitempty"`
	ImportedCount         int                          `json:"imported_count"`
	SkippedCount          int                          `json:"skipped_count"`
	SkippedDuplicateCount int                          `json:"skipped_duplicate_count"`
	SkippedMissingCount   int                          `json:"skipped_missing_count"`
	SkippedInvalidCount   int                          `json:"skipped_invalid_count"`
	Skipped               []OperatorAliasImportSkipped `json:"skipped"`
}

type OperatorAliasCreateInput struct {
	Input OperatorAliasCreate `json:"input" binding:"required"`
}

type OperatorAliasUpdateInput struct {
	Input OperatorAliasUpdate `json:"input" binding:"required"`
}

type OperatorAliasDeleteInput struct {
	Input OperatorAliasDelete `json:"input" binding:"required"`
}

type OperatorAliasImportInput struct {
	Input OperatorAliasImport `json:"input" binding:"required"`
}

type OperatorAliasCreate struct {
	Name                 string `json:"name" binding:"required"`
	Alias                string `json:"alias" binding:"required"`
	AliasType            string `json:"alias_type"`
	PayloadTypeID        *int   `json:"payloadtype_id"`
	ConsumingContainerID *int   `json:"consuming_container_id"`
	Active               *bool  `json:"active"`
}

type OperatorAliasUpdate struct {
	ID                   int    `json:"id" binding:"required"`
	Name                 string `json:"name" binding:"required"`
	Alias                string `json:"alias" binding:"required"`
	AliasType            string `json:"alias_type"`
	PayloadTypeID        *int   `json:"payloadtype_id"`
	ConsumingContainerID *int   `json:"consuming_container_id"`
	Active               bool   `json:"active"`
}

type OperatorAliasDelete struct {
	ID int `json:"id" binding:"required"`
}

type OperatorAliasImport struct {
	Config string `json:"config" binding:"required"`
}

type OperatorAliasPortableConfig struct {
	Version int                          `json:"version"`
	Aliases []OperatorAliasPortableAlias `json:"aliases"`
}

type OperatorAliasPortableAlias struct {
	Name      string                     `json:"name"`
	Alias     string                     `json:"alias"`
	AliasType string                     `json:"alias_type"`
	Active    bool                       `json:"active"`
	Scope     OperatorAliasPortableScope `json:"scope,omitempty"`
}

type OperatorAliasPortableScope struct {
	Type string `json:"type"`
	Name string `json:"name"`
}

type OperatorAliasImportSkipped struct {
	Index     int    `json:"index"`
	Name      string `json:"name,omitempty"`
	Alias     string `json:"alias,omitempty"`
	AliasType string `json:"alias_type,omitempty"`
	ScopeType string `json:"scope_type,omitempty"`
	ScopeName string `json:"scope_name,omitempty"`
	Reason    string `json:"reason"`
	Error     string `json:"error"`
}

type operatorAliasExportRow struct {
	Name              string         `db:"name"`
	Alias             string         `db:"alias"`
	AliasType         string         `db:"alias_type"`
	Active            bool           `db:"active"`
	PayloadTypeName   sql.NullString `db:"payloadtype_name"`
	ChatContainerName sql.NullString `db:"chat_container_name"`
}

const (
	operatorAliasExportVersion       = 1
	operatorAliasScopePayloadType    = "payload_type"
	operatorAliasScopeChatContainer  = "chat_container"
	operatorAliasSkipDuplicateReason = "duplicate"
	operatorAliasSkipMissingReason   = "missing_scope"
	operatorAliasSkipInvalidReason   = "invalid"
)

func OperatorAliasCreateWebhook(c *gin.Context) {
	var input OperatorAliasCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	active := true
	if input.Input.Active != nil {
		active = *input.Input.Active
	}
	normalized, aliasText, aliasType, scope, err := validateOperatorAliasValues(
		operatorID,
		input.Input.Name,
		input.Input.Alias,
		input.Input.AliasType,
		input.Input.PayloadTypeID,
		input.Input.ConsumingContainerID,
		0,
	)
	if err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	var payloadTypeID interface{}
	var consumingContainerID interface{}
	if scope.PayloadTypeID > 0 {
		payloadTypeID = scope.PayloadTypeID
	}
	if scope.ConsumingContainerID > 0 {
		consumingContainerID = scope.ConsumingContainerID
	}
	tx, err := database.DB.Beginx()
	if err != nil {
		logging.LogError(err, "Failed to start operator alias create transaction")
		operatorAliasRespondError(c, "failed to create alias")
		return
	}
	defer tx.Rollback()
	if active {
		if err = deactivateOperatorAliasSiblings(tx, operatorID, aliasType, scope, normalized, 0); err != nil {
			logging.LogError(err, "Failed to deactivate sibling operator aliases")
			operatorAliasRespondError(c, "failed to create alias")
			return
		}
	}
	var aliasID int
	err = tx.Get(&aliasID, `INSERT INTO operator_alias
		(operator_id, name, alias, alias_type, payloadtype_id, consuming_container_id, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`,
		operatorID,
		normalized,
		aliasText,
		aliasType,
		payloadTypeID,
		consumingContainerID,
		active)
	if err != nil {
		logging.LogError(err, "Failed to create operator alias")
		operatorAliasRespondError(c, "failed to create alias; an alias with that name may already exist for this scope")
		return
	}
	if err = tx.Commit(); err != nil {
		logging.LogError(err, "Failed to commit operator alias create")
		operatorAliasRespondError(c, "failed to create alias")
		return
	}
	c.JSON(http.StatusOK, OperatorAliasActionOutput{Status: "success", ID: aliasID})
}

func OperatorAliasUpdateWebhook(c *gin.Context) {
	var input OperatorAliasUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	if input.Input.ID <= 0 {
		operatorAliasRespondError(c, "alias id is required")
		return
	}
	var existingID int
	if err = database.DB.Get(&existingID,
		`SELECT id FROM operator_alias WHERE id=$1 AND operator_id=$2`,
		input.Input.ID, operatorID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			operatorAliasRespondError(c, "failed to find an alias owned by the current operator")
			return
		}
		logging.LogError(err, "Failed to fetch operator alias for update")
		operatorAliasRespondError(c, "failed to fetch alias")
		return
	}
	normalized, aliasText, aliasType, scope, err := validateOperatorAliasValues(
		operatorID,
		input.Input.Name,
		input.Input.Alias,
		input.Input.AliasType,
		input.Input.PayloadTypeID,
		input.Input.ConsumingContainerID,
		input.Input.ID,
	)
	if err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	var payloadTypeID interface{}
	var consumingContainerID interface{}
	if scope.PayloadTypeID > 0 {
		payloadTypeID = scope.PayloadTypeID
	}
	if scope.ConsumingContainerID > 0 {
		consumingContainerID = scope.ConsumingContainerID
	}
	tx, err := database.DB.Beginx()
	if err != nil {
		logging.LogError(err, "Failed to start operator alias update transaction")
		operatorAliasRespondError(c, "failed to update alias")
		return
	}
	defer tx.Rollback()
	if input.Input.Active {
		if err = deactivateOperatorAliasSiblings(tx, operatorID, aliasType, scope, normalized, input.Input.ID); err != nil {
			logging.LogError(err, "Failed to deactivate sibling operator aliases")
			operatorAliasRespondError(c, "failed to update alias")
			return
		}
	}
	if _, err = tx.Exec(`UPDATE operator_alias
		SET name=$1,
			alias=$2,
			alias_type=$3,
			payloadtype_id=$4,
			consuming_container_id=$5,
			active=$6
		WHERE id=$7 AND operator_id=$8`,
		normalized,
		aliasText,
		aliasType,
		payloadTypeID,
		consumingContainerID,
		input.Input.Active,
		input.Input.ID,
		operatorID); err != nil {
		logging.LogError(err, "Failed to update operator alias")
		operatorAliasRespondError(c, "failed to update alias; an alias with that name may already exist for this scope")
		return
	}
	if err = tx.Commit(); err != nil {
		logging.LogError(err, "Failed to commit operator alias update")
		operatorAliasRespondError(c, "failed to update alias")
		return
	}
	c.JSON(http.StatusOK, OperatorAliasActionOutput{Status: "success", ID: input.Input.ID})
}

func OperatorAliasDeleteWebhook(c *gin.Context) {
	var input OperatorAliasDeleteInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		operatorAliasRespondError(c, err.Error())
		return
	}
	result, err := database.DB.Exec(`DELETE FROM operator_alias WHERE id=$1 AND operator_id=$2`, input.Input.ID, operatorID)
	if err != nil {
		logging.LogError(err, "Failed to delete operator alias")
		operatorAliasRespondError(c, "failed to delete alias")
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		operatorAliasRespondError(c, "failed to find an alias owned by the current operator")
		return
	}
	c.JSON(http.StatusOK, OperatorAliasActionOutput{Status: "success", ID: input.Input.ID})
}

func OperatorAliasExportWebhook(c *gin.Context) {
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, OperatorAliasExportOutput{Status: "error", Error: err.Error()})
		return
	}
	aliasRows := []operatorAliasExportRow{}
	if err = database.DB.Select(&aliasRows, `SELECT
			operator_alias.name,
			operator_alias.alias,
			operator_alias.alias_type,
			operator_alias.active,
			payloadtype.name "payloadtype_name",
			consuming_container.name "chat_container_name"
		FROM operator_alias
		LEFT JOIN payloadtype ON operator_alias.payloadtype_id = payloadtype.id
		LEFT JOIN consuming_container ON operator_alias.consuming_container_id = consuming_container.id
		WHERE operator_alias.operator_id=$1
		ORDER BY
			COALESCE(consuming_container.name, ''),
			COALESCE(payloadtype.name, ''),
			operator_alias.alias_type,
			operator_alias.name,
			operator_alias.alias,
			operator_alias.id`, operatorID); err != nil {
		logging.LogError(err, "Failed to fetch operator aliases for export")
		c.JSON(http.StatusOK, OperatorAliasExportOutput{Status: "error", Error: "failed to fetch aliases"})
		return
	}
	config := OperatorAliasPortableConfig{
		Version: operatorAliasExportVersion,
		Aliases: make([]OperatorAliasPortableAlias, 0, len(aliasRows)),
	}
	for _, alias := range aliasRows {
		portableAlias := OperatorAliasPortableAlias{
			Name:      alias.Name,
			Alias:     alias.Alias,
			AliasType: alias.AliasType,
			Active:    alias.Active,
		}
		if alias.PayloadTypeName.Valid {
			portableAlias.Scope = OperatorAliasPortableScope{
				Type: operatorAliasScopePayloadType,
				Name: alias.PayloadTypeName.String,
			}
		} else if alias.ChatContainerName.Valid {
			portableAlias.Scope = OperatorAliasPortableScope{
				Type: operatorAliasScopeChatContainer,
				Name: alias.ChatContainerName.String,
			}
		}
		config.Aliases = append(config.Aliases, portableAlias)
	}
	configBytes, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		logging.LogError(err, "Failed to marshal operator aliases for export")
		c.JSON(http.StatusOK, OperatorAliasExportOutput{Status: "error", Error: "failed to export aliases"})
		return
	}
	c.JSON(http.StatusOK, OperatorAliasExportOutput{Status: "success", Config: string(configBytes)})
}

func OperatorAliasImportWebhook(c *gin.Context) {
	var input OperatorAliasImportInput
	if err := c.ShouldBindJSON(&input); err != nil {
		operatorAliasRespondImportError(c, err.Error())
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		operatorAliasRespondImportError(c, err.Error())
		return
	}
	config := OperatorAliasPortableConfig{}
	if err = json.Unmarshal([]byte(input.Input.Config), &config); err != nil {
		operatorAliasRespondImportError(c, "failed to parse alias import config")
		return
	}
	if config.Version != operatorAliasExportVersion {
		operatorAliasRespondImportError(c, fmt.Sprintf("unsupported alias import config version %d", config.Version))
		return
	}
	response := OperatorAliasImportOutput{
		Status:  "success",
		Skipped: []OperatorAliasImportSkipped{},
	}
	tx, err := database.DB.Beginx()
	if err != nil {
		logging.LogError(err, "Failed to start operator alias import transaction")
		operatorAliasRespondImportError(c, "failed to import aliases")
		return
	}
	defer tx.Rollback()
	for index, alias := range config.Aliases {
		normalized, aliasText, aliasType, invalidReason := normalizePortableOperatorAlias(alias)
		if invalidReason != "" {
			response.addSkippedAlias(index, alias, operatorAliasSkipInvalidReason, invalidReason)
			continue
		}
		scope, missingReason, invalidReason, err := resolvePortableOperatorAliasScope(tx, alias.Scope)
		if err != nil {
			logging.LogError(err, "Failed to resolve imported operator alias scope")
			operatorAliasRespondImportError(c, "failed to import aliases")
			return
		}
		if invalidReason != "" {
			response.addSkippedAlias(index, alias, operatorAliasSkipInvalidReason, invalidReason)
			continue
		}
		if missingReason != "" {
			response.addSkippedAlias(index, alias, operatorAliasSkipMissingReason, missingReason)
			continue
		}
		exists, err := operatorAliasExactDuplicateExists(tx, operatorID, normalized, aliasText, aliasType, scope, 0)
		if err != nil {
			logging.LogError(err, "Failed to check imported operator alias duplicate")
			operatorAliasRespondImportError(c, "failed to import aliases")
			return
		}
		if exists {
			response.addSkippedAlias(index, alias, operatorAliasSkipDuplicateReason, "alias already exists for that scope")
			continue
		}
		err = insertImportedOperatorAlias(tx, operatorID, normalized, aliasText, aliasType, scope)
		if err != nil {
			logging.LogError(err, "Failed to insert imported operator alias")
			operatorAliasRespondImportError(c, "failed to import aliases")
			return
		}
		response.ImportedCount += 1
	}
	if err = tx.Commit(); err != nil {
		logging.LogError(err, "Failed to commit operator alias import")
		operatorAliasRespondImportError(c, "failed to import aliases")
		return
	}
	c.JSON(http.StatusOK, response)
}

func validateOperatorAliasValues(operatorID int, name string, alias string, aliasType string, payloadTypeID *int, consumingContainerID *int, excludeID int) (string, string, string, rabbitmq.OperatorAliasScope, error) {
	normalized := rabbitmq.NormalizeOperatorAliasName(name)
	if !rabbitmq.IsValidOperatorAliasName(normalized) {
		return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("alias name must start with a letter and contain only letters, numbers, underscores, or hyphens")
	}
	normalizedType := rabbitmq.NormalizeOperatorAliasType(aliasType)
	if !rabbitmq.IsValidOperatorAliasType(normalizedType) {
		return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("alias type must be command or generic")
	}
	if normalizedType == rabbitmq.OperatorAliasTypeGeneric && rabbitmq.IsReservedOperatorAliasName(normalized) {
		return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("alias name %q is reserved for task references", normalized)
	}
	alias = strings.TrimSpace(alias)
	if alias == "" {
		return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("alias expansion is required")
	}
	scope := rabbitmq.OperatorAliasScope{}
	if payloadTypeID != nil && *payloadTypeID > 0 {
		scope.PayloadTypeID = *payloadTypeID
	}
	if consumingContainerID != nil && *consumingContainerID > 0 {
		scope.ConsumingContainerID = *consumingContainerID
	}
	if (scope.PayloadTypeID > 0) && (scope.ConsumingContainerID > 0) {
		return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("select at most one alias scope")
	}
	if scope.PayloadTypeID > 0 {
		payloadType := databaseStructs.Payloadtype{}
		err := database.DB.Get(&payloadType,
			`SELECT id FROM payloadtype WHERE id=$1 AND deleted=false`,
			scope.PayloadTypeID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("failed to find that payload type")
			}
			return "", "", "", rabbitmq.OperatorAliasScope{}, err
		}
	} else if scope.ConsumingContainerID > 0 {
		container := databaseStructs.ConsumingContainer{}
		err := database.DB.Get(&container,
			`SELECT id FROM consuming_container WHERE id=$1 AND type=$2 AND deleted=false`,
			scope.ConsumingContainerID, rabbitmq.CONSUMING_SERVICES_TYPE_CHAT)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("failed to find that chat container")
			}
			return "", "", "", rabbitmq.OperatorAliasScope{}, err
		}
	}
	exists, err := operatorAliasExactDuplicateExists(database.DB, operatorID, normalized, alias, normalizedType, scope, excludeID)
	if err != nil {
		return "", "", "", rabbitmq.OperatorAliasScope{}, err
	}
	if exists {
		return "", "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("alias %s already exists with that expansion for that scope", normalized)
	}
	return normalized, alias, normalizedType, scope, nil
}

type operatorAliasGetter interface {
	Get(dest interface{}, query string, args ...interface{}) error
}

type operatorAliasExecutor interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

func normalizePortableOperatorAlias(alias OperatorAliasPortableAlias) (string, string, string, string) {
	normalized := rabbitmq.NormalizeOperatorAliasName(alias.Name)
	if !rabbitmq.IsValidOperatorAliasName(normalized) {
		return "", "", "", "alias name must start with a letter and contain only letters, numbers, underscores, or hyphens"
	}
	aliasType := rabbitmq.NormalizeOperatorAliasType(alias.AliasType)
	if !rabbitmq.IsValidOperatorAliasType(aliasType) {
		return "", "", "", "alias type must be command or generic"
	}
	if aliasType == rabbitmq.OperatorAliasTypeGeneric && rabbitmq.IsReservedOperatorAliasName(normalized) {
		return "", "", "", fmt.Sprintf("alias name %q is reserved for task references", normalized)
	}
	aliasText := strings.TrimSpace(alias.Alias)
	if aliasText == "" {
		return "", "", "", "alias expansion is required"
	}
	return normalized, aliasText, aliasType, ""
}

var PayloadTypeIDs = make(map[string]int)
var ChatContainerIDs = make(map[string]int)
var PayloadTypeContainerNameIDMutex sync.Mutex

func resolvePortableOperatorAliasScope(getter operatorAliasGetter, portableScope OperatorAliasPortableScope) (rabbitmq.OperatorAliasScope, string, string, error) {
	scopeType := strings.ToLower(strings.TrimSpace(portableScope.Type))
	scopeName := strings.TrimSpace(portableScope.Name)
	if scopeType == "" && scopeName == "" {
		return rabbitmq.OperatorAliasScope{}, "", "", nil
	}
	if scopeName == "" {
		return rabbitmq.OperatorAliasScope{}, "", "scope name is required", nil
	}
	scope := rabbitmq.OperatorAliasScope{}
	PayloadTypeContainerNameIDMutex.Lock()
	defer PayloadTypeContainerNameIDMutex.Unlock()
	switch scopeType {
	case operatorAliasScopePayloadType:
		if id, ok := PayloadTypeIDs[scopeName]; ok {
			scope.PayloadTypeID = id
			return scope, "", "", nil
		}
		err := getter.Get(&scope.PayloadTypeID, `SELECT id FROM payloadtype WHERE name=$1 AND deleted=false LIMIT 1`, scopeName)
		if errors.Is(err, sql.ErrNoRows) {
			return rabbitmq.OperatorAliasScope{}, fmt.Sprintf("payload type %q was not found", scopeName), "", nil
		}
		if err != nil {
			return rabbitmq.OperatorAliasScope{}, "", "", err
		}
		PayloadTypeIDs[scopeName] = scope.PayloadTypeID
	case operatorAliasScopeChatContainer:
		if id, ok := ChatContainerIDs[scopeName]; ok {
			scope.ConsumingContainerID = id
			return scope, "", "", nil
		}
		err := getter.Get(&scope.ConsumingContainerID,
			`SELECT id FROM consuming_container WHERE name=$1 AND type=$2 AND deleted=false LIMIT 1`,
			scopeName, rabbitmq.CONSUMING_SERVICES_TYPE_CHAT)
		if errors.Is(err, sql.ErrNoRows) {
			return rabbitmq.OperatorAliasScope{}, fmt.Sprintf("chat container %q was not found", scopeName), "", nil
		}
		if err != nil {
			return rabbitmq.OperatorAliasScope{}, "", "", err
		}
		ChatContainerIDs[scopeName] = scope.ConsumingContainerID
	default:
		return rabbitmq.OperatorAliasScope{}, "", "scope type must be payload_type or chat_container", nil
	}
	return scope, "", "", nil
}

func operatorAliasExactDuplicateExists(getter operatorAliasGetter, operatorID int, name string, aliasText string, aliasType string, scope rabbitmq.OperatorAliasScope, excludeID int) (bool, error) {
	var existingID int
	var err error
	if scope.PayloadTypeID > 0 {
		err = getter.Get(&existingID, `SELECT id
			FROM operator_alias
			WHERE operator_id=$1 AND payloadtype_id=$2 AND consuming_container_id IS NULL
				AND name=$3 AND alias=$4 AND alias_type=$5 AND id<>$6
			LIMIT 1`,
			operatorID, scope.PayloadTypeID, name, aliasText, aliasType, excludeID)
	} else if scope.ConsumingContainerID > 0 {
		err = getter.Get(&existingID, `SELECT id
			FROM operator_alias
			WHERE operator_id=$1 AND consuming_container_id=$2 AND payloadtype_id IS NULL
				AND name=$3 AND alias=$4 AND alias_type=$5 AND id<>$6
			LIMIT 1`,
			operatorID, scope.ConsumingContainerID, name, aliasText, aliasType, excludeID)
	} else {
		err = getter.Get(&existingID, `SELECT id
			FROM operator_alias
			WHERE operator_id=$1 AND payloadtype_id IS NULL AND consuming_container_id IS NULL
				AND name=$2 AND alias=$3 AND alias_type=$4 AND id<>$5
			LIMIT 1`,
			operatorID, name, aliasText, aliasType, excludeID)
	}
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func deactivateOperatorAliasSiblings(executor operatorAliasExecutor, operatorID int, aliasType string, scope rabbitmq.OperatorAliasScope, name string, excludeID int) error {
	var err error
	if scope.PayloadTypeID > 0 {
		_, err = executor.Exec(`UPDATE operator_alias
			SET active=false
			WHERE operator_id=$1 AND payloadtype_id=$2 AND consuming_container_id IS NULL
				AND alias_type=$3 AND name=$4 AND active=true AND id<>$5`,
			operatorID, scope.PayloadTypeID, aliasType, name, excludeID)
	} else if scope.ConsumingContainerID > 0 {
		_, err = executor.Exec(`UPDATE operator_alias
			SET active=false
			WHERE operator_id=$1 AND consuming_container_id=$2 AND payloadtype_id IS NULL
				AND alias_type=$3 AND name=$4 AND active=true AND id<>$5`,
			operatorID, scope.ConsumingContainerID, aliasType, name, excludeID)
	} else {
		_, err = executor.Exec(`UPDATE operator_alias
			SET active=false
			WHERE operator_id=$1 AND payloadtype_id IS NULL AND consuming_container_id IS NULL
				AND alias_type=$2 AND name=$3 AND active=true AND id<>$4`,
			operatorID, aliasType, name, excludeID)
	}
	return err
}

func insertImportedOperatorAlias(executor operatorAliasExecutor, operatorID int, name string, aliasText string, aliasType string, scope rabbitmq.OperatorAliasScope) error {
	var payloadTypeID interface{}
	var consumingContainerID interface{}
	if scope.PayloadTypeID > 0 {
		payloadTypeID = scope.PayloadTypeID
	}
	if scope.ConsumingContainerID > 0 {
		consumingContainerID = scope.ConsumingContainerID
	}
	_, err := executor.Exec(`INSERT INTO operator_alias
		(operator_id, name, alias, alias_type, payloadtype_id, consuming_container_id, active)
		VALUES ($1, $2, $3, $4, $5, $6, true)`,
		operatorID, name, aliasText, aliasType, payloadTypeID, consumingContainerID)
	return err
}

func (response *OperatorAliasImportOutput) addSkippedAlias(index int, alias OperatorAliasPortableAlias, reason string, err string) {
	response.SkippedCount += 1
	switch reason {
	case operatorAliasSkipDuplicateReason:
		response.SkippedDuplicateCount += 1
	case operatorAliasSkipMissingReason:
		response.SkippedMissingCount += 1
	case operatorAliasSkipInvalidReason:
		response.SkippedInvalidCount += 1
	}
	response.Skipped = append(response.Skipped, OperatorAliasImportSkipped{
		Index:     index,
		Name:      alias.Name,
		Alias:     alias.Alias,
		AliasType: alias.AliasType,
		ScopeType: alias.Scope.Type,
		ScopeName: alias.Scope.Name,
		Reason:    reason,
		Error:     err,
	})
}

func operatorAliasRespondError(c *gin.Context, err string) {
	c.JSON(http.StatusOK, OperatorAliasActionOutput{Status: "error", Error: err})
}

func operatorAliasRespondImportError(c *gin.Context, err string) {
	c.JSON(http.StatusOK, OperatorAliasImportOutput{
		Status:  "error",
		Error:   err,
		Skipped: []OperatorAliasImportSkipped{},
	})
}
