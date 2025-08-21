package webcontroller

import (
	"database/sql"
	"errors"
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

var inviteUseMutex sync.Mutex

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
	inviteLinkCode := utils.GenerateRandomAlphaNumericString(20)
	if input.Input.ShortCode != "" {
		inviteLinkCode = input.Input.ShortCode
		invite := databaseStructs.InviteLink{}
		err = database.DB.Get(&invite, `SELECT id FROM invite_link WHERE short_code=$1`, input.Input.ShortCode)
		if !errors.Is(err, sql.ErrNoRows) {
			logging.LogError(err, "short code for invite link already exists")
			c.JSON(http.StatusOK, CreateInviteLinkResponse{
				Status: "error",
				Error:  "Code has been used before, leave blank or specify new short code",
			})
			return
		}
	}
	host := c.GetHeader("X-Forwarded-Origin")
	if host == "" {
		host = fmt.Sprintf("%s://%s", c.GetHeader("X-Forwarded-Proto"), c.GetHeader("X-Forwarded-Host"))
	}
	inviteLinkURI := fmt.Sprintf("%s/new/invite?code=%s", host, inviteLinkCode)
	invite := databaseStructs.InviteLink{
		ShortCode: inviteLinkCode,
		TotalUsed: 0,
		TotalUses: input.Input.TotalUsage,
		Name:      input.Input.Name,
	}
	invite.OperatorID = operator.ID
	if input.Input.OperationID > 0 {
		invite.OperationID.Valid = true
		invite.OperationID.Int64 = int64(input.Input.OperationID)
	}
	if input.Input.OperationRole != "" {
		invite.OperationRole.Valid = true
		invite.OperationRole.String = input.Input.OperationRole
	}
	_, err = database.DB.NamedExec(`INSERT INTO invite_link 
		("name", operation_id, operation_role, operator_id, total_used, total_uses, short_code)
		VALUES
		(:name, :operation_id, :operation_role, :operator_id, :total_used, :total_uses, :short_code)`, invite)
	if err != nil {
		logging.LogError(err, "failed to insert invite link")
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
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
	operationID := 0
	operationRole := ""
	inviteUseMutex.Lock()
	defer inviteUseMutex.Unlock()
	invite := databaseStructs.InviteLink{}
	err = database.DB.Get(&invite, `SELECT 
    	short_code, created_at, operator_id, operation_id, "name", total_uses, total_used, operation_role, invite_link.id,
    	operator.username "operator.username"
		FROM invite_link 
		JOIN operator ON operator.id = invite_link.operator_id
		WHERE short_code=$1`, input.InviteCode)
	if err != nil {
		logging.LogError(err, "failed to find short code")
		c.JSON(http.StatusOK, gin.H{"error": "Unknown invite code"})
		return
	}
	if invite.TotalUsed >= invite.TotalUses {
		c.JSON(http.StatusOK, gin.H{"error": "code already used max number of times"})
		return
	}
	invite.TotalUsed += 1
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
	_, err = database.DB.NamedExec(`UPDATE invite_link SET total_used=:total_used WHERE id=:id`, invite)
	if err != nil {
		logging.LogError(err, "Failed to update invite link counts")
	}
	go database.AssignNewOperatorAllBrowserScripts(newOperator.ID)
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s's invite link, %s, was used for user: %s",
		invite.Operator.Username, input.InviteCode, newOperator.Username), 0, "", database.MESSAGE_LEVEL_INFO)
	if invite.OperationID.Int64 > 0 {
		if invite.OperationRole.String == "" || invite.OperationRole.String == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
		} else if invite.OperationRole.String == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR {
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
		} else if invite.OperationRole.String == database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR {
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
		} else {
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
		}
		_, err = database.DB.NamedExec(`INSERT INTO operatoroperation 
			(operator_id, operation_id, view_mode)
			VALUES (:operator_id, :operation_id, :view_mode)`,
			databaseStructs.Operatoroperation{
				OperationID: int(invite.OperationID.Int64), OperatorID: newOperator.ID, ViewMode: operationRole,
			})
		if err != nil {
			logging.LogError(err, "Failed to insert operator operation", "operation", invite.OperationID.Int64)
			c.JSON(http.StatusOK, UseInviteLinkResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		newOperator.CurrentOperationID.Valid = true
		newOperator.CurrentOperationID.Int64 = invite.OperationID.Int64
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
	invites := []databaseStructs.InviteLink{}
	err = database.DB.Select(&invites, `SELECT
    		short_code, created_at, operator_id, operation_id, "name", total_uses, total_used, operation_role, invite_link.id,
    		operator.username "operator.username"
    		FROM invite_link
    		JOIN operator ON operator.id = invite_link.operator_id`)
	if err != nil {
		logging.LogError(err, "Failed to get invite links")
		c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get invite links",
		})
		return
	}
	host := c.GetHeader("X-Forwarded-Origin")
	if host == "" {
		host = fmt.Sprintf("%s://%s", c.GetHeader("X-Forwarded-Proto"), c.GetHeader("X-Forwarded-Host"))
	}
	returnCodes := make([]inviteLinkData, len(invites))
	for k, _ := range invites {
		returnCodes[k] = inviteLinkData{
			Code:                       invites[k].ShortCode,
			GeneratingOperatorUsername: invites[k].Operator.Username,
			GenerationTime:             invites[k].CreatedAt,
			OperationID:                int(invites[k].OperationID.Int64),
			OperationRole:              invites[k].OperationRole.String,
			TotalUsage:                 invites[k].TotalUses,
			UsedSoFar:                  invites[k].TotalUsed,
			Valid:                      invites[k].TotalUsed < invites[k].TotalUses,
			Name:                       invites[k].Name,
			Link:                       fmt.Sprintf("%s/new/invite?code=%s", host, invites[k].ShortCode),
		}
	}
	c.JSON(http.StatusOK, GetOutstandingInviteLinkResponse{
		Status: "success",
		Links:  returnCodes,
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
	invite := databaseStructs.InviteLink{}
	err = database.DB.Get(&invite, `SELECT * FROM invite_link WHERE short_code=$1`, input.Input.Code)
	if err != nil {
		c.JSON(http.StatusOK, UpdateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get invite information",
		})
		return
	}
	invite.TotalUses = input.Input.NewTotal
	_, err = database.DB.NamedExec(`UPDATE invite_link SET total_uses=:total_uses WHERE id=:id`, invite)
	if err != nil {
		c.JSON(http.StatusOK, UpdateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to update invite information",
		})
		return
	}
	c.JSON(http.StatusOK, UpdateInviteLinkResponse{
		Status: "success",
	})
	return
}
