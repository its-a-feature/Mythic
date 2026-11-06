package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/jmoiron/sqlx"
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

var errInviteUnavailable = errors.New("Invite code is unavailable")

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
	globalSetting := databaseStructs.GlobalSetting{}
	err = database.DB.Get(&globalSetting, `SELECT setting FROM global_setting WHERE "name"=$1`, "server_config")
	if err != nil {
		logging.LogError(err, "Failed to get global setting")
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get setting",
		})
		return
	}
	MythicServerConfig := databaseStructs.GlobalSettingServerConfig{}
	err = mapstructure.Decode(globalSetting.Setting.StructValue(), &MythicServerConfig)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal setting")
		c.JSON(http.StatusOK, CreateInviteLinkResponse{
			Status: "error",
			Error:  "Failed to get setting",
		})
		return
	}
	if !MythicServerConfig.AllowInviteLinks {
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
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s generated a new invite link to this server",
		operator.Username), 0, "", database.MESSAGE_LEVEL_AUTH, false)
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
	newOperator, invite, err := redeemInviteLink(database.DB, input)
	if err != nil {
		logging.LogError(err, "failed to redeem invite link")
		message := "Failed to redeem invite code"
		if errors.Is(err, errInviteUnavailable) {
			message = errInviteUnavailable.Error()
		} else {
			logging.LogError(err, "Failed to redeem invite")
		}
		c.JSON(http.StatusOK, UseInviteLinkResponse{Status: "error", Error: message})
		return
	}
	// Publish side effects only after all account and membership writes commit.
	go database.AssignNewOperatorAllBrowserScripts(newOperator.ID)
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s's invite link was used for user: %s",
		invite.Operator.Username, newOperator.Username), 0, "", database.MESSAGE_LEVEL_AUTH, false)
	c.JSON(http.StatusOK, UseInviteLinkResponse{Status: "success"})
}

func redeemInviteLink(db *sqlx.DB, input UseInviteLinkInput) (databaseStructs.Operator, databaseStructs.InviteLink, error) {
	newOperator := databaseStructs.Operator{}
	invite := databaseStructs.InviteLink{}
	tx, err := db.Beginx()
	if err != nil {
		logging.LogError(err, "failed to begin transaction")
		return newOperator, invite, err
	}
	defer tx.Rollback()

	globalSetting := databaseStructs.GlobalSetting{}
	err = database.DB.Get(&globalSetting, `SELECT setting FROM global_setting WHERE "name"=$1`, "server_config")
	if err != nil {
		return newOperator, invite, err
	}
	MythicServerConfig := databaseStructs.GlobalSettingServerConfig{}
	err = mapstructure.Decode(globalSetting.Setting.StructValue(), &MythicServerConfig)
	if err != nil {
		return newOperator, invite, err
	}
	if !MythicServerConfig.AllowInviteLinks {
		return newOperator, invite, err
	}
	err = tx.Get(&invite, `SELECT 
    	invite_link.id, 
    	invite_link.operator_id, 
    	operation_id,
		operation_role, 
		total_uses, 
		total_used, 
		operator.username "operator.username"
		FROM invite_link 
		    JOIN operator ON operator.id = invite_link.operator_id
		WHERE short_code=$1 AND 
		      operator.active AND 
		      NOT operator.deleted AND 
		      operator.admin
		FOR UPDATE OF invite_link FOR SHARE OF operator`, input.InviteCode)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return newOperator, invite, errInviteUnavailable
		}
		return newOperator, invite, err
	}
	if invite.TotalUsed >= invite.TotalUses {
		logging.LogError(err, "invite link already used too many times")
		return newOperator, invite, errInviteUnavailable
	}
	newOperator = databaseStructs.Operator{
		Admin: false, Username: input.Username, Salt: uuid.NewString(), Active: true,
		AccountType: databaseStructs.AccountTypeUser,
	}
	if input.Email != "" {
		newOperator.Email = sql.NullString{String: input.Email, Valid: true}
	}
	newOperator.Password = database.HashUserPassword(newOperator, input.Password)
	err = tx.Get(&newOperator.ID, `INSERT INTO operator
		(admin, username, salt, password, failed_login_count, active, account_type, email)
		VALUES ($1,$2,$3,$4,0,$5,$6,$7) RETURNING id`,
		newOperator.Admin, newOperator.Username, newOperator.Salt, newOperator.Password,
		newOperator.Active, newOperator.AccountType, newOperator.Email)
	if err != nil {
		logging.LogError(err, "failed to redeem invite link and create new operator")
		return newOperator, invite, err
	}
	if invite.OperationID.Valid && invite.OperationID.Int64 > 0 {
		operationRole := database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
		switch invite.OperationRole.String {
		case "", database.OPERATOR_OPERATION_VIEW_MODE_LEAD, database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR:
			operationRole = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
		}
		_, err = tx.Exec(`INSERT INTO operatoroperation (operator_id, operation_id, view_mode)
			VALUES ($1,$2,$3)`, newOperator.ID, invite.OperationID.Int64, operationRole)
		if err != nil {
			logging.LogError(err, "failed to redeem invite link")
			return newOperator, invite, err
		}
		newOperator.CurrentOperationID = invite.OperationID
		_, err = tx.Exec(`UPDATE operator SET current_operation_id=$1 WHERE id=$2`,
			invite.OperationID, newOperator.ID)
		if err != nil {
			logging.LogError(err, "failed to redeem invite link")
			return newOperator, invite, err
		}
	}
	_, err = tx.Exec(`UPDATE invite_link SET total_used=total_used+1 WHERE id=$1`, invite.ID)
	if err != nil {
		logging.LogError(err, "failed to redeem invite link")
		return newOperator, invite, err
	}
	err = tx.Commit()
	if err != nil {
		logging.LogError(err, "failed to redeem invite link")
		return newOperator, invite, err
	}
	return newOperator, invite, nil
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
