package webcontroller

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

const maxWrappablePayloadsPageSize = 100

type GetWrappablePayloadsInput struct {
	Input GetWrappablePayloadsArguments `json:"input" binding:"required"`
}

type GetWrappablePayloadsArguments struct {
	WrapperPayloadTypeID int                                           `json:"wrapper_payload_type_id" binding:"required"`
	BuildParameters      []rabbitmq.PayloadConfigurationBuildParameter `json:"build_parameters"`
	Limit                int                                           `json:"limit"`
	Offset               int                                           `json:"offset"`
}

type WrappablePayloadReference struct {
	ID int `json:"id"`
}

type GetWrappablePayloadsResponse struct {
	Status     string                      `json:"status"`
	Error      string                      `json:"error,omitempty"`
	TotalCount int                         `json:"total_count"`
	Limit      int                         `json:"limit"`
	Offset     int                         `json:"offset"`
	Payloads   []WrappablePayloadReference `json:"payloads"`
}

func GetWrappablePayloadsWebhook(c *gin.Context) {
	response := GetWrappablePayloadsResponse{
		Status:   "error",
		Payloads: []WrappablePayloadReference{},
	}
	input := GetWrappablePayloadsInput{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		response.Error = err.Error()
		c.JSON(http.StatusOK, response)
		return
	}
	response.Limit = input.Input.Limit
	response.Offset = input.Input.Offset
	if input.Input.Limit < 1 || input.Input.Limit > maxWrappablePayloadsPageSize {
		response.Error = fmt.Sprintf("limit must be between 1 and %d", maxWrappablePayloadsPageSize)
		c.JSON(http.StatusOK, response)
		return
	}
	if input.Input.Offset < 0 {
		response.Error = "offset must be zero or greater"
		c.JSON(http.StatusOK, response)
		return
	}

	userID, err := GetUserIDFromGin(c)
	if err != nil {
		response.Error = err.Error()
		c.JSON(http.StatusOK, response)
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil || user.CurrentOperationID.Int64 == 0 {
		response.Error = "failed to determine current operation"
		c.JSON(http.StatusOK, response)
		return
	}

	result, err := rabbitmq.SearchWrappablePayloads(
		input.Input.WrapperPayloadTypeID,
		int(user.CurrentOperationID.Int64),
		input.Input.BuildParameters,
		input.Input.Limit,
		input.Input.Offset,
	)
	if err != nil {
		logging.LogError(err, "Failed to search for wrappable payloads")
		response.Error = err.Error()
		c.JSON(http.StatusOK, response)
		return
	}
	response.Status = "success"
	response.TotalCount = result.TotalCount
	for _, payloadID := range result.PayloadIDs {
		response.Payloads = append(response.Payloads, WrappablePayloadReference{ID: payloadID})
	}
	c.JSON(http.StatusOK, response)
}
