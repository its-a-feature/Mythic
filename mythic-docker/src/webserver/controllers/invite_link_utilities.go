package webcontroller

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
	"net/http"
	"sync"
	"time"
)

type CreateInviteLinkMessage struct {
	Input CreateInviteLinkInput `json:"input"`
}
type CreateInviteLinkInput struct {
	OperationID   int    `json:"operation_id"`
	OperationRole string `json:"operation_role"`
	TotalUsage    int    `json:"total"`
	Name          string `json:"name"`
	ShortCode     string `json:"short_code"`
}
type CreateInviteLinkResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
	Link   string `json:"link"`
}
type inviteLinkData struct {
	Code                       string    `json:"code"`
	Link                       string    `json:"link"`
	GeneratingOperatorUsername string    `json:"operator"`
	GenerationTime             time.Time `json:"created_at"`
	OperationID                int       `json:"operation_id"`
	OperationRole              string    `json:"operation_role"`
	TotalUsage                 int       `json:"total"`
	UsedSoFar                  int       `json:"used"`
	Valid                      bool      `json:"valid"`
	Name                       string    `json:"name"`
}

var inviteLinkCodes = make(map[string]*inviteLinkData)
var inviteLinkCodesLock = sync.RWMutex{}

func CreateInviteLink(c *gin.Context) {
	var input CreateInviteLinkMessage
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "bad input")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operator, err := database.GetUserFromID(operatorID)
	if err != nil {
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	if !operator.Admin {
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "You are not an administrator",
		})
		return
	}
	if operator.Deleted || !operator.Active {
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "You are not an active operator",
		})
		return
	}
	if !utils.MythicConfig.MythicServerAllowInviteLinks {
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "Invite links disabled for this server",
		})
		return
	}
	inviteLinkCode := utils.GenerateRandomAlphaNumericString(15)
	if input.Input.ShortCode != "" {
		inviteLinkCode = input.Input.ShortCode
		inviteLinkCodesLock.Lock()
		_, ok := inviteLinkCodes[inviteLinkCode]
		inviteLinkCodesLock.Unlock()
		if ok {
			c.JSON(http.StatusOK, CreateInviteLinkResponse{
				Status: "error",
				Error:  "Code has been used before, leave blank or specify new name",
			})
			return
		}

	}

	inviteLinkURI := fmt.Sprintf("%s/new/invite?code=%s", c.GetHeader("X-Forwarded-Origin"), inviteLinkCode)
	inviteLinkCodesLock.Lock()
	inviteLinkCodes[inviteLinkCode] = &inviteLinkData{
		GeneratingOperatorUsername: operator.Username,
		GenerationTime:             time.Now().UTC(),
		Valid:                      true,
		Code:                       inviteLinkCode,
		Link:                       inviteLinkURI,
		OperationID:                input.Input.OperationID,
		OperationRole:              input.Input.OperationRole,
		TotalUsage:                 input.Input.TotalUsage,
		UsedSoFar:                  0,
		Name:                       input.Input.Name,
	}
	inviteLinkCodesLock.Unlock()
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s generated a new invite link to this server: %s\n%s",
		operator.Username, inviteLinkCode, inviteLinkURI), 0, "", database.MESSAGE_LEVEL_INFO)
	c.JSON(http.StatusOK, CreateInviteLinkResponse{
		Status: "success",
		Link:   inviteLinkURI,
	})
	return
}

type UseInviteLinkInput struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	InviteCode string `json:"code" binding:"required"`
	Email      string `json:"email"`
}
type UseInviteLinkResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func unUseInviteLink(inviteCode string) {
	inviteLinkCodesLock.Lock()
	_, ok := inviteLinkCodes[inviteCode]
	if ok {
		if inviteLinkCodes[inviteCode].UsedSoFar >= inviteLinkCodes[inviteCode].TotalUsage {
			inviteLinkCodes[inviteCode].Valid = true
		}
		inviteLinkCodes[inviteCode].UsedSoFar -= 1
	}
	inviteLinkCodesLock.Unlock()
}
func UseInviteLink(c *gin.Context) {
	var input UseInviteLinkInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "bad input")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(input.Password) < 12 {
		c.JSON(http.StatusOK, UseInviteLinkResponse{
			Status: "error",
			Error:  "Password must be at least 12 characters long",
		})
		return
	}
	valid := false
	operationID := 0
	operationRole := ""
	inviteLinkCodesLock.Lock()
	inviteCodeData, ok := inviteLinkCodes[input.InviteCode]
	if ok {
		valid = inviteLinkCodes[input.InviteCode].Valid
		operationID = inviteLinkCodes[input.InviteCode].OperationID
		operationRole = inviteLinkCodes[input.InviteCode].OperationRole
		if valid {
			inviteLinkCodes[input.InviteCode].UsedSoFar += 1
			if inviteLinkCodes[input.InviteCode].UsedSoFar >= inviteLinkCodes[input.InviteCode].TotalUsage {
				inviteLinkCodes[input.InviteCode].Valid = false
			}
		}
	}
	inviteLinkCodesLock.Unlock()
	if !ok {
		c.JSON(http.StatusOK, gin.H{"error": "Unknown invite code"})
		return
	}
	if !valid {
		c.JSON(http.StatusOK, gin.H{"error": "Invite code already used maximum number of times"})
		return
	}

	// get the associated database information
	salt := uuid.New().String()
	newOperator := databaseStructs.Operator{
		Admin:            false,
		Username:         input.Username,
		Salt:             salt,
		FailedLoginCount: 0,
		Active:           true,
	}
	if input.Email != "" {
		newOperator.Email.Valid = true
		newOperator.Email.String = input.Email
	}
	newOperator.AccountType = databaseStructs.AccountTypeUser
	newOperator.Password = database.HashUserPassword(newOperator, input.Password)
	statement, err := database.DB.PrepareNamed(`INSERT INTO operator 
	(admin, username, salt, password, failed_login_count, active, account_type, email) 
	VALUES (:admin, :username, :salt, :password, :failed_login_count, :active, :account_type, :email)
	RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create named statement for new operator")
		c.JSON(http.StatusOK, UseInviteLinkResponse{
			Status: "error",
			Error:  err.Error(),
		})
		unUseInviteLink(input.InviteCode)
		return
	}
	err = statement.Get(&newOperator.ID, newOperator)
	if err != nil {
		logging.LogError(err, "Failed to create new operator", "operator", newOperator)
		c.JSON(http.StatusOK, UseInviteLinkResponse{
			Status: "error",
			Error:  err.Error(),
		})
		unUseInviteLink(input.InviteCode)
		return
	}
	go database.AssignNewOperatorAllBrowserScripts(newOperator.ID)
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s's invite link, %s, was used for user: %s",
		inviteCodeData.GeneratingOperatorUsername, input.InviteCode, newOperator.Username), 0, "", database.MESSAGE_LEVEL_INFO)
	if operationID > 0 {
		if operationRole == "" || operationRole == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
		} else if operationRole == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR ||
			operationRole == database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR {

		} else {
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
		}
		_, err = database.DB.NamedExec(`INSERT INTO operatoroperation 
			(operator_id, operation_id, view_mode)
			VALUES (:operator_id, :operation_id, :view_mode)`,
			databaseStructs.Operatoroperation{
				OperationID: operationID, OperatorID: newOperator.ID, ViewMode: operationRole,
			})
		if err != nil {
			logging.LogError(err, "Failed to insert operator operation", "operation", operationID)
			c.JSON(http.StatusOK, UseInviteLinkResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		newOperator.CurrentOperationID.Valid = true
		newOperator.CurrentOperationID.Int64 = int64(operationID)
		_, err = database.DB.NamedExec(`UPDATE operator SET current_operation_id=:current_operation_id WHERE id=:id`,
			newOperator)
		if err != nil {
			logging.LogError(err, "Failed to update operator operation", "operation", operationID)
			c.JSON(http.StatusOK, UseInviteLinkResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
	}
	c.JSON(http.StatusOK, UseInviteLinkResponse{
		Status: "success",
	})
}

type GetOutstandingInviteLinkResponse struct {
	Status string           `json:"status"`
	Error  string           `json:"error"`
	Links  []inviteLinkData `json:"links"`
}

func GetOutstandingInviteLinks(c *gin.Context) {
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operator, err := database.GetUserFromID(operatorID)
	if err != nil {
		c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	if !operator.Admin {
		c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
			Status: "error",
			Error:  "You are not an administrator",
		})
		return
	}
	if operator.Deleted || !operator.Active {
		c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
			Status: "error",
			Error:  "You are not an active operator",
		})
		return
	}
	inviteLinkCodesLock.RLock()
	returnCodes := make([]inviteLinkData, len(inviteLinkCodes))
	i := 0
	for k, _ := range inviteLinkCodes {
		returnCodes[i] = *inviteLinkCodes[k]
		i++
	}
	inviteLinkCodesLock.RUnlock()
	c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
		Status: "success",
		Links:  returnCodes,
	})
	return
}

type DeleteInviteLinkInput struct {
	Input DeleteInviteLinkInputMessage `json:"input" binding:"required"`
}
type DeleteInviteLinkInputMessage struct {
	Code string `json:"code" binding:"required"`
}
type DeleteInviteLinkResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func DeleteInviteLink(c *gin.Context) {
	var input DeleteInviteLinkInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "bad input")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, DeleteInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operator, err := database.GetUserFromID(operatorID)
	if err != nil {
		c.JSON(http.StatusOK, DeleteInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	if !operator.Admin {
		c.JSON(http.StatusOK, DeleteInviteLinkResponse{
			Status: "error",
			Error:  "You are not an administrator",
		})
		return
	}
	if operator.Deleted || !operator.Active {
		c.JSON(http.StatusOK, DeleteInviteLinkResponse{
			Status: "error",
			Error:  "You are not an active operator",
		})
		return
	}
	inviteLinkCodesLock.Lock()
	if _, ok := inviteLinkCodes[input.Input.Code]; ok {
		inviteLinkCodes[input.Input.Code].Valid = !inviteLinkCodes[input.Input.Code].Valid
	}
	inviteLinkCodesLock.Unlock()
	c.JSON(http.StatusOK, DeleteInviteLinkResponse{
		Status: "success",
	})
	return
}

type UpdateInviteLinkInput struct {
	Input UpdateInviteLinkInputMessage `json:"input" binding:"required"`
}
type UpdateInviteLinkInputMessage struct {
	Code     string `json:"code" binding:"required"`
	NewTotal int    `json:"total" binding:"required"`
}
type UpdateInviteLinkResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func UpdateInviteLink(c *gin.Context) {
	var input UpdateInviteLinkInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "bad input")
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, UpdateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operator, err := database.GetUserFromID(operatorID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	if !operator.Admin {
		c.JSON(http.StatusOK, UpdateInviteLinkResponse{
			Status: "error",
			Error:  "You are not an administrator",
		})
		return
	}
	if operator.Deleted || !operator.Active {
		c.JSON(http.StatusOK, UpdateInviteLinkResponse{
			Status: "error",
			Error:  "You are not an active operator",
		})
		return
	}
	inviteLinkCodesLock.Lock()
	if _, ok := inviteLinkCodes[input.Input.Code]; ok {
		inviteLinkCodes[input.Input.Code].TotalUsage = input.Input.NewTotal
		if inviteLinkCodes[input.Input.Code].TotalUsage < 0 {
			inviteLinkCodes[input.Input.Code].TotalUsage = 0
		}
		if input.Input.NewTotal <= inviteLinkCodes[input.Input.Code].UsedSoFar {
			inviteLinkCodes[input.Input.Code].Valid = false
		} else {
			inviteLinkCodes[input.Input.Code].Valid = true
		}
	}
	inviteLinkCodesLock.Unlock()
	c.JSON(http.StatusOK, UpdateInviteLinkResponse{
		Status: "success",
	})
	return
}
