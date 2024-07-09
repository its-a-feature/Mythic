package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateResponseUserOutputInput struct {
	Input CreateResponseUserOutput `json:"input" binding:"required"`
}

type CreateResponseUserOutput struct {
	TaskID     int    `json:"task_id" binding:"required"`
	UserOutput string `json:"user_output" binding:"required"`
}

type CreateResponseUserOutputInputResponse struct {
	ID     int    `json:"id"`
	Status string `json:"status,omitempty"`
	Error  string `json:"error,omitempty"`
}

func ResponseUserOutputCreateWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateResponseUserOutputInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreatePayloadWebhook")
		c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	if input.Input.UserOutput == "" {
		c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
			Status: "error",
			Error:  "No output provided",
		})
		return
	}
	task := databaseStructs.Task{}
	err = database.DB.Get(&task, `SELECT id FROM task WHERE id=$1 AND operation_id=$2`,
		input.Input.TaskID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find task")
		c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
			Status: "error",
			Error:  "Failed to find task",
		})
		return
	}
	databaseObj := databaseStructs.Response{
		OperationID: operatorOperation.CurrentOperation.ID,
		TaskID:      task.ID,
		Response:    []byte(input.Input.UserOutput),
	}
	APITokenID, ok := c.Get("apitokens-id")
	if ok {
		if APITokenID.(int) > 0 {
			databaseObj.APITokensID.Valid = true
			databaseObj.APITokensID.Int64 = int64(APITokenID.(int))
		}
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO response
				(task_id, operation_id, apitokens_id, response)
				VALUES (:task_id, :operation_id, :apitokens_id, :response)
				RETURNING id `)
	if err != nil {
		logging.LogError(err, "Failed to create new user output")
		c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&databaseObj.ID, databaseObj)
	if err != nil {
		logging.LogError(err, "Failed to create new user output")
		c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, CreateResponseUserOutputInputResponse{
		Status: "success",
		ID:     databaseObj.ID,
	})
	return
}
