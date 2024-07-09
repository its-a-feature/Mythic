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
	Used                       bool      `json:"-"`
}

var inviteLinkCodes = make(map[string]*inviteLinkData)
var inviteLinkCodesLock = sync.RWMutex{}

func CreateInviteLink(c *gin.Context) {
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
	//logging.LogInfo("incoming headers", "headers", c.Request.Header)
	inviteLinkURI := fmt.Sprintf("%s/new/invite?code=%s", c.GetHeader("X-Forwarded-Origin"), inviteLinkCode)
	inviteLinkCodesLock.Lock()
	inviteLinkCodes[inviteLinkCode] = &inviteLinkData{
		GeneratingOperatorUsername: operator.Username,
		GenerationTime:             time.Now().UTC(),
		Used:                       false,
		Code:                       inviteLinkCode,
		Link:                       inviteLinkURI,
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
	alreadyUsed := false
	inviteLinkCodesLock.Lock()
	inviteCodeData, ok := inviteLinkCodes[input.InviteCode]
	if ok {
		alreadyUsed = inviteLinkCodes[input.InviteCode].Used
	}
	inviteLinkCodesLock.Unlock()
	if !ok {
		c.JSON(http.StatusOK, gin.H{"error": "Unknown invite code"})
		return
	}
	if alreadyUsed {
		c.JSON(http.StatusOK, gin.H{"error": "Invite code already used"})
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
		return
	}
	err = statement.Get(&newOperator.ID, newOperator)
	if err != nil {
		logging.LogError(err, "Failed to create new operator", "operator", newOperator)
		c.JSON(http.StatusOK, UseInviteLinkResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	go database.AssignNewOperatorAllBrowserScripts(newOperator.ID)
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s's invite link, %s, was used for user: %s",
		inviteCodeData.GeneratingOperatorUsername, input.InviteCode, newOperator.Username), 0, "", database.MESSAGE_LEVEL_INFO)
	c.JSON(http.StatusOK, UseInviteLinkResponse{
		Status: "success",
	})
	inviteLinkCodesLock.Lock()
	inviteCodeData, ok = inviteLinkCodes[input.InviteCode]
	if ok {
		inviteLinkCodes[input.InviteCode].Used = true
	}
	inviteLinkCodesLock.Unlock()
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
	returnCodes := make([]inviteLinkData, 0)
	for k, _ := range inviteLinkCodes {
		if !inviteLinkCodes[k].Used {
			returnCodes = append(returnCodes, *inviteLinkCodes[k])
		}
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
		inviteLinkCodes[input.Input.Code].Used = true
	}
	inviteLinkCodesLock.Unlock()
	c.JSON(http.StatusOK, DeleteInviteLinkResponse{
		Status: "success",
	})
	return
}
