package webcontroller

import (
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"net/http"
)

type DeleteTasksAndCallbacksInput struct {
	Input DeleteTasksAndCallbacksMessage `json:"input" binding:"required"`
}

type DeleteTasksAndCallbacksMessage struct {
	TaskDisplayIDs     []int `json:"task_display_ids"`
	CallbackDisplayIDs []int `json:"callback_display_ids"`
}

type DeleteTasksAndCallbacksMessageResponse struct {
	Status                   string `json:"status"`
	Error                    string `json:"error"`
	FailedTaskDisplayIDs     []int  `json:"failed_task_display_ids"`
	FailedCallbackDisplayIDs []int  `json:"failed_callback_display_ids"`
}

func DeleteTasksAndCallbacks(c *gin.Context) {
	// get variables from the POST request
	var input DeleteTasksAndCallbacksInput
	response := DeleteTasksAndCallbacksMessageResponse{}
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, DeleteTasksAndCallbacksMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, DeleteTasksAndCallbacksMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		for _, callbackDisplayID := range input.Input.CallbackDisplayIDs {
			if _, err := database.DB.Exec(`DELETE FROM callback WHERE display_id=$1 AND operation_id=$2`,
				callbackDisplayID, operatorOperation.CurrentOperation.ID); err != nil {
				logging.LogError(err, "Failed to delete callback", "callback_display_id", callbackDisplayID)
				response.FailedCallbackDisplayIDs = append(response.FailedCallbackDisplayIDs, callbackDisplayID)
			}
		}
		for _, taskDisplayID := range input.Input.TaskDisplayIDs {
			if _, err := database.DB.Exec(`DELETE FROM task WHERE display_id=$1 AND operation_id=$2`,
				taskDisplayID, operatorOperation.CurrentOperation.ID); err != nil {
				logging.LogError(err, "Failed to delete task", "task_display_id", taskDisplayID)
				response.FailedTaskDisplayIDs = append(response.FailedTaskDisplayIDs, taskDisplayID)
			}
		}
		response.Status = "success"
		c.JSON(http.StatusOK, response)
		return

	}

}
