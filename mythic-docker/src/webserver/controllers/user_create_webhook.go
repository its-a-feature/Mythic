package webcontroller

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"net/http"
)

type CreateOperatorInput struct {
	Input CreateOperator `json:"input" binding:"required"`
}
type CreateOperatorInputInput struct {
	Input CreateOperatorInput `json:"input" binding:"required"`
}

type CreateOperator struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password"`
	IsBot    bool   `json:"bot"`
	Email    string `json:"email"`
}

type CreateOperatorResponse struct {
	Username    string `json:"username"`
	AccountType string `json:"account_type"`
	Admin       bool   `json:"admin"`
	Email       string `json:"email"`
	Active      bool   `json:"active"`
	ViewUTCTime bool   `json:"view_utc_time"`
	ID          int    `json:"id"`
	Status      string `json:"status"`
	Error       string `json:"error"`
}

func CreateOperatorWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateOperatorInputInput // we'll fix this after the new stuff comes out to not have the double input
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if len(input.Input.Input.Username) == 0 {
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  "Must supply a username",
		})
		return
	}
	if input.Input.Input.IsBot {
		input.Input.Input.Password = utils.GenerateRandomPassword(50)
	}
	if len(input.Input.Input.Password) < 12 {
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  "Password must be at least 12 characters long",
		})
		return
	}
	// get the associated database information
	salt := uuid.New().String()
	newOperator := databaseStructs.Operator{
		Admin:            false,
		Username:         input.Input.Input.Username,
		Salt:             salt,
		FailedLoginCount: 0,
		Active:           true,
	}
	if input.Input.Input.Email != "" {
		newOperator.Email.Valid = true
		newOperator.Email.String = input.Input.Input.Email
	}
	if input.Input.Input.IsBot {
		newOperator.AccountType = databaseStructs.AccountTypeBot
	} else {
		newOperator.AccountType = databaseStructs.AccountTypeUser
	}
	newOperator.Password = database.HashUserPassword(newOperator, input.Input.Input.Password)
	operatorID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operator, err := database.GetUserFromID(operatorID)
	if err != nil {
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	if !operator.Admin {
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  "Only admins can create new operators",
		})
		return
	}
	if operator.Deleted || !operator.Active {
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  "You are not an active operator",
		})
		return
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO operator 
	(admin, username, salt, password, failed_login_count, active, account_type, email) 
	VALUES (:admin, :username, :salt, :password, :failed_login_count, :active, :account_type, :email)
	RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create named statement for new operator")
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&newOperator.ID, newOperator)
	if err != nil {
		logging.LogError(err, "Failed to create new operator", "operator", newOperator)
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if !input.Input.Input.IsBot {
		go database.AssignNewOperatorAllBrowserScripts(newOperator.ID)
	}
	c.JSON(http.StatusOK, CreateOperatorResponse{
		Status:      "success",
		Username:    input.Input.Input.Username,
		ID:          newOperator.ID,
		Admin:       newOperator.Admin,
		AccountType: newOperator.AccountType,
		Email:       newOperator.Email.String,
		Active:      newOperator.Active,
	})
	return

}
