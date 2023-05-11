package webcontroller

import (
	"database/sql"
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
}

type UpdateOperationResponse struct {
	Status   string `json:"status"`
	Error    string `json:"error"`
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Channel  string `json:"channel"`
	Complete bool   `json:"complete"`
	Webhook  string `json:"webhook"`
	AdminID  int    `json:"admin_id"`
	Deleted  bool   `json:"deleted"`
}

func UpdateOperationWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateOperationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	operator := databaseStructs.Operator{}
	operatorRole := databaseStructs.Operatoroperation{}
	if userID, err := GetUserIDFromGin(c); err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err = database.DB.Get(&operator, `SELECT * FROM operator WHERE id=$1`, userID); err != nil {
		logging.LogError(err, "Failed to get information about operator")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err = database.DB.Get(&operatorRole, `SELECT * FROM operatoroperation WHERE 
		operator_id=$1 AND operation_id=$2`, operator.ID, input.Input.OperationID); err != sql.ErrNoRows && err != nil {
		logging.LogError(err, "Failed to get information about operator's role in operation")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return

	} else if !operator.Admin && operatorRole.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
		logging.LogError(nil, "Tried to update operation, but not admin or operation lead")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  "Must be global admin or lead of operation to update it",
		})
		return
	} else {
		// get the associated database information
		currentOperation := databaseStructs.Operation{
			ID: input.Input.OperationID,
		}
		if err := database.DB.Get(&currentOperation, `SELECT * FROM operation WHERE id=$1`, currentOperation.ID); err != nil {
			logging.LogError(err, "Failed to fetch operation information")
			c.JSON(http.StatusOK, UpdateOperationResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else {
			if input.Input.Name != nil {
				currentOperation.Name = *input.Input.Name
			}
			if input.Input.Deleted != nil {
				currentOperation.Deleted = *input.Input.Deleted
			}
			if input.Input.Webhook != nil {
				currentOperation.Webhook = *input.Input.Webhook
			}
			if input.Input.Complete != nil {
				currentOperation.Complete = *input.Input.Complete
			}
			if input.Input.Channel != nil {
				currentOperation.Channel = *input.Input.Channel
			}
			if input.Input.AdminID != nil {
				if _, err := database.DB.Exec(`UPDATE operatoroperation SET view_mode=$1
					WHERE view_mode=$2 AND operation_id=$3`,
					database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR, database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
					input.Input.OperationID); err != nil {
					logging.LogError(err, "Failed to set other operators view mode to operator")
					c.JSON(http.StatusOK, UpdateOperationResponse{
						Status: "error",
						Error:  "Failed to update operator statuses",
					})
					return
				} else {
					currentOperation.AdminID = *input.Input.AdminID
					newUser := databaseStructs.Operator{ID: *input.Input.AdminID}
					var currentOperatorOperationID int
					if _, err := database.DB.NamedExec(`UPDATE operation SET 
		 				admin_id=:admin_id WHERE id=:id`, currentOperation); err != nil {
						logging.LogError(err, "Failed to update admin")
						c.JSON(http.StatusOK, UpdateOperationResponse{
							Status: "error",
							Error:  err.Error(),
						})
						return
					} else if err := database.DB.Get(&currentOperatorOperationID, `SELECT id FROM
              operatoroperation WHERE operator_id=$1 AND operation_id=$2`, currentOperation.AdminID, currentOperation.ID); err == sql.ErrNoRows {
						// admin was set and they were never a member, so add them
						if _, err := database.DB.Exec(`INSERT INTO operatoroperation (operator_id, operation_id, view_mode)
							VALUES ($1, $2, $3)`, currentOperation.AdminID, currentOperation.ID,
							database.OPERATOR_OPERATION_VIEW_MODE_LEAD); err != nil {
							logging.LogError(err, "Failed to add operator to operation")
						} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
							logging.LogError(err, "Failed to lookup operator username")
						} else {
							go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s to lead", newUser.Username),
								currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
						}
					} else if _, err := database.DB.Exec(`UPDATE operatoroperation SET 
						 view_mode=$1 WHERE operator_id=$2 AND operation_id=$3`,
						database.OPERATOR_OPERATION_VIEW_MODE_LEAD, currentOperation.AdminID, currentOperation.ID); err != nil {
						logging.LogError(err, "Failed to update the view_mode of the admin to lead")
					} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
						logging.LogError(err, "Failed to lookup operator username")
					} else {
						go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s to lead", newUser.Username),
							currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
					}
				}
			}
			if _, err := database.DB.NamedExec(`UPDATE operation SET 
		 	"name"=:name, complete=:complete, webhook=:webhook, channel=:channel, deleted=:deleted WHERE id=:id`,
				currentOperation); err != nil {
				logging.LogError(err, "Failed to update operation data")
				c.JSON(http.StatusOK, UpdateOperationResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			} else {
				c.JSON(http.StatusOK, UpdateOperationResponse{
					Status:   "success",
					Name:     currentOperation.Name,
					Channel:  currentOperation.Channel,
					Complete: currentOperation.Complete,
					Webhook:  currentOperation.Webhook,
					Deleted:  currentOperation.Deleted,
					ID:       currentOperation.ID,
					AdminID:  currentOperation.AdminID,
				})
				return
			}
		}
	}

}
