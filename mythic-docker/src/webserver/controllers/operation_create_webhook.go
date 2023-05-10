package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateOperationInput struct {
	Input CreateOperation `json:"input" binding:"required"`
}

type CreateOperation struct {
	Name string `json:"name" binding:"required"`
}

type CreateOperationResponse struct {
	OperationID   int    `json:"operation_id"`
	OperationName string `json:"operation_name"`
	Status        string `json:"status"`
	Error         string `json:"error"`
}

func CreateOperationWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateOperationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if userID, err := GetUserIDFromGin(c); err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else {
		// get the associated database information
		newOperation := databaseStructs.Operation{
			AdminID: userID,
			Name:    input.Input.Name,
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO operation 
			(admin_id, "name") 
			VALUES (:admin_id, :name)
			RETURNING id`); err != nil {
			logging.LogError(err, "Failed to create named statement for new operation")
			c.JSON(http.StatusOK, CreateOperationResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else if err := statement.Get(&newOperation.ID, newOperation); err != nil {
			logging.LogError(err, "Failed to create new operation", "operation", newOperation)
			c.JSON(http.StatusOK, CreateOperationResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else {
			// we created the operation, now create a new operatorOperation mapping for this user as the lead
			newOperatorOperation := databaseStructs.Operatoroperation{
				OperatorID:  userID,
				OperationID: newOperation.ID,
				ViewMode:    database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
			}
			if _, err := database.DB.NamedExec(`INSERT INTO operatoroperation
			(operator_id, operation_id, view_mode)
			VALUES (:operator_id, :operation_id, :view_mode)`, newOperatorOperation); err != nil {
				logging.LogError(err, "Failed to create new operatorOperation mapping", "operatoroperation", newOperatorOperation)
				c.JSON(http.StatusOK, CreateOperationResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			} else {
				c.JSON(http.StatusOK, CreateOperationResponse{
					Status:        "success",
					OperationID:   newOperation.ID,
					OperationName: newOperation.Name,
				})
				return
			}
		}
	}

}
