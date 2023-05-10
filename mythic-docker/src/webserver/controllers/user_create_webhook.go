package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateOperatorInput struct {
	Input CreateOperator `json:"input" binding:"required"`
}
type CreateOperatorInputInput struct {
	Input CreateOperatorInput `json:"input" binding:"required"`
}

type CreateOperator struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type CreateOperatorResponse struct {
	Username string `json:"username"`
	ID       int    `json:"id"`
	Status   string `json:"status"`
	Error    string `json:"error"`
}

func CreateOperatorWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateOperatorInputInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
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
	} else if len(input.Input.Input.Password) < 12 {
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
	newOperator.Password = database.HashUserPassword(newOperator, input.Input.Input.Password)
	if statement, err := database.DB.PrepareNamed(`INSERT INTO operator 
	(admin, username, salt, password, failed_login_count, active) 
	VALUES (:admin, :username, :salt, :password, :failed_login_count, :active)
	RETURNING id`); err != nil {
		logging.LogError(err, "Failed to create named statement for new operator")
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err := statement.Get(&newOperator.ID, newOperator); err != nil {
		logging.LogError(err, "Failed to create new operator", "operator", newOperator)
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else {
		go database.AssignNewOperatorAllBrowserScripts(newOperator.ID)
		c.JSON(http.StatusOK, CreateOperatorResponse{
			Status:   "success",
			Username: input.Input.Input.Username,
			ID:       newOperator.ID,
		})
		return
	}
}
