package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"

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

type OperatorAliasCreateInput struct {
	Input OperatorAliasCreate `json:"input" binding:"required"`
}

type OperatorAliasUpdateInput struct {
	Input OperatorAliasUpdate `json:"input" binding:"required"`
}

type OperatorAliasDeleteInput struct {
	Input OperatorAliasDelete `json:"input" binding:"required"`
}

type OperatorAliasCreate struct {
	SlashCommand         string `json:"slash_command" binding:"required"`
	ActualCommand        string `json:"actual_command" binding:"required"`
	PayloadTypeID        *int   `json:"payloadtype_id"`
	ConsumingContainerID *int   `json:"consuming_container_id"`
	Active               *bool  `json:"active"`
}

type OperatorAliasUpdate struct {
	ID                   int    `json:"id" binding:"required"`
	SlashCommand         string `json:"slash_command" binding:"required"`
	ActualCommand        string `json:"actual_command" binding:"required"`
	PayloadTypeID        *int   `json:"payloadtype_id"`
	ConsumingContainerID *int   `json:"consuming_container_id"`
	Active               bool   `json:"active"`
}

type OperatorAliasDelete struct {
	ID int `json:"id" binding:"required"`
}

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
	normalized, actualCommand, scope, err := validateOperatorAliasValues(
		operatorID,
		input.Input.SlashCommand,
		input.Input.ActualCommand,
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
	var aliasID int
	err = database.DB.Get(&aliasID, `INSERT INTO operator_alias
		(operator_id, slash_command, actual_command, payloadtype_id, consuming_container_id, active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		operatorID,
		normalized,
		actualCommand,
		payloadTypeID,
		consumingContainerID,
		active)
	if err != nil {
		logging.LogError(err, "Failed to create operator alias")
		operatorAliasRespondError(c, "failed to create alias; an alias with that command may already exist for this scope")
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
	normalized, actualCommand, scope, err := validateOperatorAliasValues(
		operatorID,
		input.Input.SlashCommand,
		input.Input.ActualCommand,
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
	if _, err = database.DB.Exec(`UPDATE operator_alias
		SET slash_command=$1,
			actual_command=$2,
			payloadtype_id=$3,
			consuming_container_id=$4,
			active=$5
		WHERE id=$6 AND operator_id=$7`,
		normalized,
		actualCommand,
		payloadTypeID,
		consumingContainerID,
		input.Input.Active,
		input.Input.ID,
		operatorID); err != nil {
		logging.LogError(err, "Failed to update operator alias")
		operatorAliasRespondError(c, "failed to update alias; an alias with that command may already exist for this scope")
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

func validateOperatorAliasValues(operatorID int, slashCommand string, actualCommand string, payloadTypeID *int, consumingContainerID *int, excludeID int) (string, string, rabbitmq.OperatorAliasScope, error) {
	normalized := rabbitmq.NormalizeOperatorAliasCommand(slashCommand)
	if !rabbitmq.IsValidOperatorAliasCommand(normalized) {
		return "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("slash command must start with a letter and contain only letters, numbers, underscores, or hyphens")
	}
	actualCommand = strings.TrimSpace(actualCommand)
	if actualCommand == "" {
		return "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("actual command is required")
	}
	scope := rabbitmq.OperatorAliasScope{}
	if payloadTypeID != nil && *payloadTypeID > 0 {
		scope.PayloadTypeID = *payloadTypeID
	}
	if consumingContainerID != nil && *consumingContainerID > 0 {
		scope.ConsumingContainerID = *consumingContainerID
	}
	if (scope.PayloadTypeID > 0) && (scope.ConsumingContainerID > 0) {
		return "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("select exactly one alias scope")
	}
	if scope.PayloadTypeID > 0 {
		payloadType := databaseStructs.Payloadtype{}
		err := database.DB.Get(&payloadType,
			`SELECT id FROM payloadtype WHERE id=$1 AND deleted=false`,
			scope.PayloadTypeID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("failed to find that payload type")
			}
			return "", "", rabbitmq.OperatorAliasScope{}, err
		}
	} else {
		container := databaseStructs.ConsumingContainer{}
		err := database.DB.Get(&container,
			`SELECT id FROM consuming_container WHERE id=$1 AND type=$2 AND deleted=false`,
			scope.ConsumingContainerID, rabbitmq.CONSUMING_SERVICES_TYPE_CHAT)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", "", rabbitmq.OperatorAliasScope{}, fmt.Errorf("failed to find that chat container")
			}
			return "", "", rabbitmq.OperatorAliasScope{}, err
		}
	}
	err := ensureOperatorAliasUnique(operatorID, normalized, scope, excludeID)
	if err != nil {
		return "", "", rabbitmq.OperatorAliasScope{}, err
	}
	return normalized, actualCommand, scope, nil
}

func ensureOperatorAliasUnique(operatorID int, slashCommand string, scope rabbitmq.OperatorAliasScope, excludeID int) error {
	var existingID int
	var err error
	if scope.PayloadTypeID > 0 {
		err = database.DB.Get(&existingID, `SELECT id
			FROM operator_alias
			WHERE operator_id=$1 AND payloadtype_id=$2 AND consuming_container_id IS NULL
				AND slash_command=$3 AND id<>$4
			LIMIT 1`,
			operatorID, scope.PayloadTypeID, slashCommand, excludeID)
	} else {
		err = database.DB.Get(&existingID, `SELECT id
			FROM operator_alias
			WHERE operator_id=$1 AND consuming_container_id=$2 AND payloadtype_id IS NULL
				AND slash_command=$3 AND id<>$4
			LIMIT 1`,
			operatorID, scope.ConsumingContainerID, slashCommand, excludeID)
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	return fmt.Errorf("alias /%s already exists for that scope", slashCommand)
}

func operatorAliasRespondError(c *gin.Context, err string) {
	c.JSON(http.StatusOK, OperatorAliasActionOutput{Status: "error", Error: err})
}
