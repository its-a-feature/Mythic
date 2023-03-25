package webcontroller

import (
	"github.com/its-a-feature/Mythic/logging"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

type UpdateCurrentOperationInput struct {
	Input UpdateCurrentOperation `json:"input" binding:"required"`
}

type UpdateCurrentOperation struct {
	UserID      int `json:"user_id" binding:"required"`
	OperationID int `json:"operation_id" binding:"required"`
}

type UpdateCurrentOperationResponse struct {
	Status      string `json:"status"`
	Error       string `json:"error"`
	OperationID int    `json:"operation_id"`
}

func UpdateCurrentOperationWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateCurrentOperationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	operatorOperation := databaseStructs.Operatoroperation{}
	issuingOperator := databaseStructs.Operator{}
	if userID, err := GetUserIDFromGin(c); err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err := database.DB.Get(&issuingOperator, `SELECT id, admin FROM operator WHERE id=$1`, userID); err != nil {
		logging.LogError(err, "Failed to get information about issuing user")
	} else if userID != input.Input.UserID && !issuingOperator.Admin {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  "Cannot set the current operation for another user",
		})
		return
	} else if err := database.DB.Get(&operatorOperation, `SELECT
		id 
		FROM operatoroperation 
		WHERE operatoroperation.operator_id=$1 and operatoroperation.operation_id=$2`,
		input.Input.UserID, input.Input.OperationID); err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  "Cannot update current operation to an operation you're not a member of",
		})
		return
	} else if _, err := database.DB.Exec(`UPDATE operator SET current_operation_id=$1 WHERE id=$2`,
		input.Input.OperationID, input.Input.UserID); err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  "Failed to update current operation",
		})
		return
	} else {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status:      "success",
			OperationID: input.Input.OperationID,
		})
		return
	}
}
