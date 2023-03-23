package webcontroller

import (
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
	OperationID   int     `json:"operation_id" binding:"required"`
	Name          *string `json:"name,omitempty"`
	Channel       *string `json:"channel,omitempty"`
	Complete      *bool   `json:"complete,omitempty"`
	Webhook       *string `json:"webhook,omitempty"`
	AdminUsername *string `json:"admin_username,omitempty"`
}

type UpdateOperationResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
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
	} else if err := database.DB.Get(&operator, `SELECT * FROM operator WHERE id=$1`, userID); err != nil {
		logging.LogError(err, "Failed to get information about operator")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err := database.DB.Get(&operatorRole, `SELECT * FROM operatoroperation WHERE 
		operator_id=$1 AND operation_id=$2`, operator.ID, input.Input.OperationID); err != nil {
		logging.LogError(err, "Failed to get information about operator's role in operation")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if !operator.Admin && operatorRole.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
		logging.LogError(nil, "Tried to update operation, but not admin or operation lead")
		c.JSON(http.StatusOK, UpdateOperationResponse{
			Status: "Must be global admin or lead of operation to update it",
			Error:  err.Error(),
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
			if input.Input.Webhook != nil {
				currentOperation.Webhook = *input.Input.Webhook
			}
			if input.Input.Complete != nil {
				currentOperation.Complete = *input.Input.Complete
			}
			if input.Input.Channel != nil {
				currentOperation.Channel = *input.Input.Channel
			}
			if input.Input.AdminUsername != nil {
				newOperator := databaseStructs.Operator{}
				if err := database.DB.Get(&newOperator.ID, `SELECT id FROM operator WHERE username=$1`, *input.Input.AdminUsername); err != nil {
					logging.LogError(err, "Failed to find operator")
					c.JSON(http.StatusOK, UpdateOperationResponse{
						Status: "error",
						Error:  "Failed to find operator",
					})
					return
				} else if _, err := database.DB.Exec(`UPDATE operatoroperation SET view_mode=$1
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
					currentOperation.AdminID = newOperator.ID
					if _, err := database.DB.NamedExec(`UPDATE operation SET 
		 				admin_id=:admin_id`, currentOperation); err != nil {
						logging.LogError(err, "Failed to update admin")
						c.JSON(http.StatusOK, UpdateOperationResponse{
							Status: "error",
							Error:  err.Error(),
						})
						return
					}
				}
			}
			if _, err := database.DB.NamedExec(`UPDATE operation SET 
		 	"name"=:name, complete=:complete, webhook=:webhook, channel=:channel`,
				currentOperation); err != nil {
				logging.LogError(err, "Failed to update operation data")
				c.JSON(http.StatusOK, UpdateOperationResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
	}
	c.JSON(http.StatusOK, UpdateOperationResponse{
		Status: "success",
	})
	return
}
