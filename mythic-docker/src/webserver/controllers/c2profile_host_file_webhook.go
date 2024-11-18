package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type C2HostFileMessageInput struct {
	Input C2HostFileMessage `json:"input" binding:"required"`
}

type C2HostFileMessage struct {
	C2ProfileID     int    `json:"c2_id" binding:"required"`
	FileUUID        string `json:"file_uuid" binding:"required"`
	HostURL         string `json:"host_url"`
	AlertOnDownload bool   `json:"alert_on_download"`
	Remove          bool   `json:"remove"`
}

type C2HostFileMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func C2HostFileMessageWebhook(c *gin.Context) {
	// get variables from the POST request
	var input C2HostFileMessageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if input.Input.HostURL == "" && !input.Input.Remove {
		logging.LogError(nil, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status: "error",
			Error:  "Must supply a hosting url path starting with '/'",
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get operatorOperation information")
		c.JSON(http.StatusOK, ArtifactCreateResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)

	c2Profile := databaseStructs.C2profile{ID: input.Input.C2ProfileID}
	if err := database.DB.Get(&c2Profile, `SELECT "name" FROM c2profile WHERE id=$1`,
		input.Input.C2ProfileID); err != nil {
		logging.LogError(err, "Failed to find c2 profile")
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	hostFile := databaseStructs.Filemeta{}
	if err := database.DB.Get(&hostFile, `SELECT deleted, id, operation_id, filename FROM filemeta WHERE agent_file_id=$1 AND operation_id=$2`,
		input.Input.FileUUID, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to find file")
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if hostFile.Deleted {
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status: "error",
			Error:  "File is deleted, can't be hosted",
		})
		return
	}
	go tagFileAs(hostFile.ID, operatorOperation.CurrentOperator.Username, hostFile.OperationID, tagTypeHostedByC2, map[string]interface{}{
		c2Profile.Name + "; " + input.Input.HostURL: map[string]interface{}{
			"c2_profile":        c2Profile.Name,
			"host_url":          input.Input.HostURL,
			"agent_file_id":     input.Input.FileUUID,
			"filename":          string(hostFile.Filename),
			"alert_on_download": input.Input.AlertOnDownload,
		},
	}, c, input.Input.Remove)

	//go rabbitmq.RestartC2ServerAfterUpdate(c2Profile.Name, true)
	c.JSON(http.StatusOK, C2HostFileMessageResponse{
		Status: "success",
		Error:  "",
	})
	return
}
