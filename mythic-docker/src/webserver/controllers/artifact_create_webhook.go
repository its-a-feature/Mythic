package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type ArtifactCreateInput struct {
	Input ArtifactCreate `json:"input" binding:"required"`
}

type ArtifactCreate struct {
	TaskID       int    `json:"task_id"`
	BaseArtifact string `json:"base_artifact" binding:"required"`
	Artifact     string `json:"artifact" binding:"required"`
	NeedsCleanup bool   `json:"needs_cleanup"`
	Resolved     bool   `json:"resolved"`
	Host         string `json:"host"`
}

type ArtifactCreateResponse struct {
	ID     int    `json:"id"`
	Status string `json:"status"`
	Error  string `json:"error"`
}

func ArtifactCreateWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ArtifactCreateInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information")
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	if input.Input.BaseArtifact == "" {
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  "No artifact type",
		})
		return
	}
	databaseObj := databaseStructs.Taskartifact{
		OperationID:  operatorOperation.CurrentOperation.ID,
		Artifact:     []byte(input.Input.Artifact),
		BaseArtifact: input.Input.BaseArtifact,
		Host:         input.Input.Host,
		NeedsCleanup: input.Input.NeedsCleanup,
		Resolved:     input.Input.Resolved,
	}
	if input.Input.TaskID > 0 {
		task := databaseStructs.Task{}
		err = database.DB.Get(&task, `SELECT id, callback_id FROM task WHERE id=$1 AND operation_id=$2`,
			input.Input.TaskID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to find task")
			c.JSON(http.StatusOK, ArtifactCreateResponse{
				Status: "error",
				Error:  "Failed to find task",
			})
			return
		}
		databaseObj.TaskID.Valid = true
		databaseObj.TaskID.Int64 = int64(task.ID)
		if input.Input.Host == "" {
			callback := databaseStructs.Callback{}
			err = database.DB.Get(&callback, `SELECT host FROM callback WHERE id=$1`, task.CallbackID)
			if err != nil {
				logging.LogError(err, "failed to get task callback information")
				c.JSON(http.StatusOK, ArtifactCreateResponse{
					Status: "error",
					Error:  "Failed to find task",
				})
				return
			}
			databaseObj.Host = callback.Host
		}
	} else if input.Input.Host == "" {
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  "Must specify a host if not associating with a specific task",
		})
		return
	}
	APITokenID, ok := c.Get("apitokens-id")
	if ok {
		if APITokenID.(int) > 0 {
			databaseObj.APITokensID.Valid = true
			databaseObj.APITokensID.Int64 = int64(APITokenID.(int))
		}
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO taskartifact
				(task_id, operation_id, apitokens_id, artifact, base_artifact, host, needs_cleanup, resolved)
				VALUES (:task_id, :operation_id, :apitokens_id, :artifact, :base_artifact, :host, :needs_cleanup, :resolved)
				RETURNING id `)
	if err != nil {
		logging.LogError(err, "Failed to create new artifact")
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&databaseObj.ID, databaseObj)
	if err != nil {
		logging.LogError(err, "Failed to create new artifact")
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, ArtifactCreateResponse{
		Status: "success",
		ID:     databaseObj.ID,
	})
	return
}
