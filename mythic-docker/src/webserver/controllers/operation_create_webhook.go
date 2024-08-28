package webcontroller

import (
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"net/http"
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
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	operator := databaseStructs.Operator{}
	err = database.DB.Get(&operator, `SELECT * FROM operator WHERE id=$1`, userID)
	if err != nil {
		logging.LogError(err, "Failed to get information about operator")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if !operator.Admin {
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  "Only admins are allowed to create new operations",
		})
		return
	}
	if operator.Deleted || !operator.Active {
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  "Account is deleted or inactive",
		})
		return
	}
	// get the associated database information
	newOperation := databaseStructs.Operation{
		AdminID: userID,
		Name:    input.Input.Name,
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO operation 
			(admin_id, "name") 
			VALUES (:admin_id, :name)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create named statement for new operation")
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&newOperation.ID, newOperation)
	if err != nil {
		logging.LogError(err, "Failed to create new operation", "operation", newOperation)
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// we created the operation, now create a new operatorOperation mapping for this user as the lead
	newOperatorOperation := databaseStructs.Operatoroperation{
		OperatorID:  userID,
		OperationID: newOperation.ID,
		ViewMode:    database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
	}
	_, err = database.DB.NamedExec(`INSERT INTO operatoroperation
			(operator_id, operation_id, view_mode)
			VALUES (:operator_id, :operation_id, :view_mode)`, newOperatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to create new operatorOperation mapping", "operatoroperation", newOperatorOperation)
		c.JSON(http.StatusOK, CreateOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	database.CreateOperationBotForOperation(newOperation)
	err = UpdateHasuraClaims(c, true)
	if err != nil {
		logging.LogError(err, "Failed to update claims")
	}
	c.JSON(http.StatusOK, CreateOperationResponse{
		Status:        "success",
		OperationID:   newOperation.ID,
		OperationName: newOperation.Name,
	})
	return
}
