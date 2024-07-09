package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateKeylogInput struct {
	Input CreateKeylog `json:"input" binding:"required"`
}

type CreateKeylog struct {
	TaskID     int    `json:"task_id" binding:"required"`
	Keystrokes string `json:"keystrokes"`
	Window     string `json:"window" binding:"required"`
	User       string `json:"user"`
}

type CreateKeylogResponse struct {
	ID     int    `json:"id"`
	Status string `json:"status"`
	Error  string `json:"error"`
}

func CreateKeylogWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateKeylogInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateKeylogResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreatePayloadWebhook")
		c.JSON(http.StatusOK, CreateKeylogResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	if input.Input.Window == "" {
		input.Input.Window = "UNKNOWN"
	}
	if input.Input.User == "" {
		input.Input.User = "UNKNOWN"
	}
	if input.Input.Keystrokes == "" {
		c.JSON(http.StatusOK, CreateKeylogResponse{
			Status: "error",
			Error:  "No keystrokes provided",
		})
		return
	}
	task := databaseStructs.Task{}
	err = database.DB.Get(&task, `SELECT id FROM task WHERE id=$1 AND operation_id=$2`,
		input.Input.TaskID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find task")
		c.JSON(http.StatusOK, CreateKeylogResponse{
			Status: "error",
			Error:  "Failed to find task",
		})
		return
	}
	databaseObj := databaseStructs.Keylog{
		Window:      input.Input.Window,
		User:        input.Input.User,
		OperationID: operatorOperation.CurrentOperation.ID,
		TaskID:      task.ID,
		Keystrokes:  []byte(input.Input.Keystrokes),
	}
	APITokenID, ok := c.Get("apitokens-id")
	if ok {
		if APITokenID.(int) > 0 {
			databaseObj.APITokensID.Valid = true
			databaseObj.APITokensID.Int64 = int64(APITokenID.(int))
		}
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO keylog
				(task_id, keystrokes, operation_id, window, user, apitokens_id)
				VALUES (:task_id, :keystrokes, :operation_id, :window, :user, :apitokens_id)
				RETURNING id `)
	if err != nil {
		logging.LogError(err, "Failed to create new keylog")
		c.JSON(http.StatusOK, CreateKeylogResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&databaseObj.ID, databaseObj)
	if err != nil {
		logging.LogError(err, "Failed to create new keylog")
		c.JSON(http.StatusOK, CreateKeylogResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, CreateKeylogResponse{
		Status: "success",
		ID:     databaseObj.ID,
	})
	return
}
