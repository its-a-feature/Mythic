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
	Tasks     []int `json:"tasks"`
	Callbacks []int `json:"callbacks"`
}

type DeleteTasksAndCallbacksMessageResponse struct {
	Status          string `json:"status"`
	Error           string `json:"error"`
	FailedTasks     []int  `json:"failed_tasks"`
	FailedCallbacks []int  `json:"failed_callbacks"`
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
		for _, callbackid := range input.Input.Callbacks {
			if _, err := database.DB.Exec(`DELETE FROM callback WHERE display_id=$1 AND operation_id=$2`,
				callbackid, operatorOperation.CurrentOperation.ID); err != nil {
				logging.LogError(err, "Failed to delete callback", "callback_id", callbackid)
				response.FailedCallbacks = append(response.FailedCallbacks, callbackid)
			}
		}
		for _, taskid := range input.Input.Tasks {
			if _, err := database.DB.Exec(`DELETE FROM task WHERE display_id=$1 AND operation_id=$2`,
				taskid, operatorOperation.CurrentOperation.ID); err != nil {
				logging.LogError(err, "Failed to delete task", "task_id", taskid)
				response.FailedTasks = append(response.FailedTasks, taskid)
			}
		}
		response.Status = "success"
		c.JSON(http.StatusOK, response)
		return

	}

}
