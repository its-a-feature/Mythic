package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdateOperationInput struct {
	Input UpdateOperation `json:"input" binding:"required"`
}

type UpdateOperation struct {
	OperationID int     `json:"operation_id" binding:"required"`
	Name        *string `json:"name,omitempty"`
	Channel     *string `json:"channel,omitempty"`
	Complete    *bool   `json:"complete,omitempty"`
	Webhook     *string `json:"webhook,omitempty"`
	AdminID     *int    `json:"admin_id,omitempty"`
	Deleted     *bool   `json:"deleted,omitempty"`
	BannerText  *string `json:"banner_text,omitempty"`
	BannerColor *string `json:"banner_color,omitempty"`
}

type UpdateOperationResponse struct {
	Status      string `json:"status"`
	Error       string `json:"error"`
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Channel     string `json:"channel"`
	Complete    bool   `json:"complete"`
	Webhook     string `json:"webhook"`
	AdminID     int    `json:"admin_id"`
	Deleted     bool   `json:"deleted"`
	BannerText  string `json:"banner_text"`
	BannerColor string `json:"banner_color"`
}

func UpdateOperationWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateOperationInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	operator := databaseStructs.Operator{}
	operatorRole := databaseStructs.Operatoroperation{}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = database.DB.Get(&operator, `SELECT * FROM operator WHERE id=$1`, userID)
	if err != nil {
		logging.LogError(err, "Failed to get information about operator")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = database.DB.Get(&operatorRole, `SELECT * FROM operatoroperation WHERE 
		operator_id=$1 AND operation_id=$2`, operator.ID, input.Input.OperationID)
	if errors.Is(err, sql.ErrNoRows) {
		logging.LogError(err, "Operator not in operation")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err != nil {
		logging.LogError(err, "Failed to get information about operator's role in operation")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if !operator.Admin && operatorRole.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
		logging.LogError(nil, "Tried to update operation, but not admin or operation lead")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  "Must be global admin or lead of operation to update it",
		})
		return
	}
	// get the associated database information
	// operator is user making request, operatorRole is current user's role in operation
	currentOperation := databaseStructs.Operation{
		ID: input.Input.OperationID,
	}
	err = database.DB.Get(&currentOperation, `SELECT * FROM operation WHERE id=$1`, currentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to fetch operation information")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	updatingWebhook := false
	if input.Input.Name != nil {
		currentOperation.Name = *input.Input.Name
	}
	if input.Input.Deleted != nil {
		currentOperation.Deleted = *input.Input.Deleted
	}
	if input.Input.Webhook != nil {
		currentOperation.Webhook = *input.Input.Webhook
		updatingWebhook = true
	}
	if input.Input.Complete != nil {
		currentOperation.Complete = *input.Input.Complete
	}
	if input.Input.Channel != nil {
		currentOperation.Channel = *input.Input.Channel
	}
	if input.Input.BannerText != nil {
		currentOperation.BannerText = *input.Input.BannerText
	}
	if input.Input.BannerColor != nil {
		currentOperation.BannerColor = *input.Input.BannerColor
	}
	if input.Input.AdminID != nil {
		// trying to update the lead of the operation
		targetOperator, err := database.GetUserFromID(*input.Input.AdminID)
		if err != nil {
			logging.LogError(err, "Failed to get information about target admin user")
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  "Failed to get information about target admin user",
			})
			return
		}
		if targetOperator.Deleted {
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  "can't set lead to deleted account",
			})
			return
		}
		if !targetOperator.Active {
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  "can't set lead to deactivated account",
			})
			return
		}
		if targetOperator.AccountType == databaseStructs.AccountTypeBot {
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  "can't set lead to bot account",
			})
			return
		}
		_, err = database.DB.Exec(`UPDATE operatoroperation SET view_mode=$1
					WHERE view_mode=$2 AND operation_id=$3`,
			database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR, database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
			input.Input.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to set other operators view mode to operator")
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  "Failed to update operator statuses",
			})
			return
		}
		currentOperation.AdminID = *input.Input.AdminID
		newUser := databaseStructs.Operator{ID: *input.Input.AdminID}
		var currentOperatorOperationID int
		_, err = database.DB.NamedExec(`UPDATE operation SET admin_id=:admin_id WHERE id=:id`, currentOperation)
		if err != nil {
			logging.LogError(err, "Failed to update admin")
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		// check if the new lead is a member of the operation
		err = database.DB.Get(&currentOperatorOperationID, `SELECT id FROM
              operatoroperation WHERE operator_id=$1 AND operation_id=$2`, currentOperation.AdminID, currentOperation.ID)
		if errors.Is(err, sql.ErrNoRows) {
			// admin was set and they were never a member, so add them
			_, err := database.DB.Exec(`INSERT INTO operatoroperation (operator_id, operation_id, view_mode)
							VALUES ($1, $2, $3)`, currentOperation.AdminID, currentOperation.ID,
				database.OPERATOR_OPERATION_VIEW_MODE_LEAD)
			if err != nil {
				logging.LogError(err, "Failed to add operator to operation")
			} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
				logging.LogError(err, "Failed to lookup operator username")
			} else {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s to lead", newUser.Username),
					currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
			}
		} else if err != nil {
			logging.LogError(err, "Failed to check for new admin's existence in current operation")
		} else {
			// the new admin is already a member of the operation, so update their status
			_, err = database.DB.Exec(`UPDATE operatoroperation SET 
						 view_mode=$1 WHERE operator_id=$2 AND operation_id=$3`,
				database.OPERATOR_OPERATION_VIEW_MODE_LEAD, currentOperation.AdminID, currentOperation.ID)
			if err != nil {
				logging.LogError(err, "Failed to update the view_mode of the admin to lead")
			} else if err = database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
				logging.LogError(err, "Failed to lookup operator username")
			} else {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s to lead", newUser.Username),
					currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
			}
		}
	}
	_, err = database.DB.NamedExec(`UPDATE operation SET 
		 	"name"=:name, complete=:complete, webhook=:webhook, 
		 	channel=:channel, deleted=:deleted, banner_text=:banner_text, banner_color=:banner_color 
                 WHERE id=:id`,
		currentOperation)
	if err != nil {
		logging.LogError(err, "Failed to update operation data")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = UpdateHasuraClaims(c, true)
	if err != nil {
		logging.LogError(err, "Failed to update claims")
	}
	if updatingWebhook {
		rabbitmq.RabbitMQConnection.EmitWebhookMessage(rabbitmq.WebhookMessage{
			OperationID:      currentOperation.ID,
			OperationName:    currentOperation.Name,
			OperationWebhook: currentOperation.Webhook,
			OperationChannel: currentOperation.Channel,
			OperatorUsername: "Mythic",
			Action:           rabbitmq.WEBHOOK_TYPE_NEW_STARTUP,
			Data: map[string]interface{}{
				"startup_message": "Mythic Online With Updated Webhook!",
			},
		})
	}
	c.JSON(http.StatusOK, UpdateOperationResponse{
		Status:      "success",
		Name:        currentOperation.Name,
		Channel:     currentOperation.Channel,
		Complete:    currentOperation.Complete,
		Webhook:     currentOperation.Webhook,
		Deleted:     currentOperation.Deleted,
		ID:          currentOperation.ID,
		AdminID:     currentOperation.AdminID,
		BannerText:  currentOperation.BannerText,
		BannerColor: currentOperation.BannerColor,
	})
	return
}
