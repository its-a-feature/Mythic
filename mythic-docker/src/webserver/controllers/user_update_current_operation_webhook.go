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
	Name        string `json:"name"`
	Complete    bool   `json:"complete"`
	BannerText  string `json:"banner_text"`
	BannerColor string `json:"banner_color"`
}

func UpdateCurrentOperationWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateCurrentOperationInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	operatorOperation := databaseStructs.Operatoroperation{}
	issuingOperator := databaseStructs.Operator{}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = database.DB.Get(&issuingOperator, `SELECT id, admin FROM operator WHERE id=$1`, userID)
	if err != nil {
		logging.LogError(err, "Failed to get information about issuing user")
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if userID != input.Input.UserID && !issuingOperator.Admin {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  "Cannot set the current operation for another user",
		})
		return
	}
	err = database.DB.Get(&operatorOperation, `SELECT
		id 
		FROM operatoroperation 
		WHERE operatoroperation.operator_id=$1 and operatoroperation.operation_id=$2`,
		input.Input.UserID, input.Input.OperationID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  "Cannot update current operation to an operation you're not a member of",
		})
		return
	}
	_, err = database.DB.Exec(`UPDATE operator SET current_operation_id=$1 WHERE id=$2`,
		input.Input.OperationID, input.Input.UserID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
			Status: "error",
			Error:  "Failed to update current operation",
		})
		return
	}
	err = UpdateHasuraClaims(c, true)
	if err != nil {
		logging.LogError(err, "Failed to update claims")
	}
	currentOperation := databaseStructs.Operation{}
	err = database.DB.Get(&currentOperation, "SELECT * FROM operation WHERE id=$1", input.Input.OperationID)
	c.JSON(http.StatusOK, UpdateCurrentOperationResponse{
		Status:      "success",
		OperationID: currentOperation.ID,
		Name:        currentOperation.Name,
		Complete:    currentOperation.Complete,
		BannerText:  currentOperation.BannerText,
		BannerColor: currentOperation.BannerColor,
	})
	return

}
