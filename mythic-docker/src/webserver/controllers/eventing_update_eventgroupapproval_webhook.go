package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
)

type UpdateEventGroupApprovalInput struct {
	Input UpdateEventGroupApproval `json:"input" binding:"required"`
}

type UpdateEventGroupApproval struct {
	EventGroupApprovalID int  `json:"eventgroupapproval_id" binding:"required"`
	Approved             bool `json:"approved"`
}

type UpdateEventGroupApprovalResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func UpdateEventGroupApprovalWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateEventGroupApprovalInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	eventgroupapproval := databaseStructs.EventGroupApproval{}
	err = database.DB.Get(&eventgroupapproval, `SELECT * FROM eventgroupapproval 
         WHERE id=$1 AND operation_id=$2 AND operator_id=$3`,
		input.Input.EventGroupApprovalID, user.CurrentOperationID.Int64, user.ID)
	if err != nil {
		logging.LogError(err, "failed to get eventgroupapproval from database")
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	_, err = database.DB.Exec(`UPDATE eventgroupapproval SET approved=$1 WHERE id=$2 AND operator_id=$3`,
		input.Input.Approved, input.Input.EventGroupApprovalID, userID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  "Failed to update approval status",
		})
		return
	}
	// now check if that's all the approvals needed to update the eventgroup approved status
	eventgroupapprovals := []databaseStructs.EventGroupApproval{}
	err = database.DB.Select(&eventgroupapprovals, `SELECT * FROM eventgroupapproval WHERE
		eventgroup_id=$1 AND operation_id=$2`, eventgroupapproval.EventGroupID, user.CurrentOperationID)
	if err != nil {
		logging.LogError(err, "failed to get other eventgroupapproval entries from database")
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  err.Error(),
		})
	}
	allApproved := true
	for i, _ := range eventgroupapprovals {
		if !eventgroupapprovals[i].Approved {
			allApproved = false
		}
	}
	_, err = database.DB.Exec(`UPDATE eventgroup SET approved_to_run=$1 WHERE id=$2`, allApproved, eventgroupapproval.EventGroupID)
	if err != nil {
		logging.LogError(err, "failed to update approval status for eventgroup")
		c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
			Status: "error",
			Error:  "Failed to update approval status",
		})
		return
	}
	c.JSON(http.StatusOK, UpdateEventGroupApprovalResponse{
		Status: "success",
	})
}
