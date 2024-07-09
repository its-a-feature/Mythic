package webcontroller

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type AvailableAuthContainerIDPs struct {
	Status string   `json:"status"`
	Error  string   `json:"error"`
	IDPs   []string `json:"idps"`
}
type AuthSubscriptions struct {
	Name string `json:"name" mapstructure:"name"`
	Type string `json:"type" mapstructure:"type"`
}

func GetAvailableAuthContainerIDPs(c *gin.Context) {
	// get variables from the POST request

	containers := []databaseStructs.ConsumingContainer{}
	err := database.DB.Select(&containers, `SELECT subscriptions, name 
		FROM consuming_container 
		WHERE container_running=true AND type='auth' AND deleted=false`)
	if err != nil {
		logging.LogError(err, "Failed to find containers")
		c.JSON(http.StatusOK, AvailableAuthContainerIDPs{
			Status: "error",
			Error:  "Failed to find available auth container",
		})
		return
	}
	IDPs := []string{}
	for _, container := range containers {
		subscriptionsArray := container.Subscriptions.StructStringValue()
		subscriptionsStructArray := make([]AuthSubscriptions, len(subscriptionsArray))
		for i, subscription := range subscriptionsArray {
			err = json.Unmarshal([]byte(subscription), &subscriptionsStructArray[i])
			if err != nil {
				c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: err.Error(), Status: "error"})
				return
			}
		}
		for _, sub := range subscriptionsStructArray {
			IDPs = append(IDPs, fmt.Sprintf("%s - %s", sub.Name, container.Name))
		}
	}
	c.JSON(http.StatusOK, AvailableAuthContainerIDPs{
		Status: "success",
		IDPs:   IDPs,
	})
	return
}

type GetAuthContainerRedirectResponse struct {
	Status        string   `json:"status"`
	Error         string   `json:"error"`
	Redirect      string   `json:"redirect"`
	RequestFields []string `json:"request_fields"`
}

func GetAuthContainerRedirect(c *gin.Context) {
	containerName := c.Param("containerName")
	IDPName := c.Param("IDPName")
	cookies := make(map[string]string)
	for _, cookie := range c.Request.Cookies() {
		cookies[cookie.Name] = cookie.String()
	}
	headers := make(map[string]string)
	for key, value := range c.Request.Header {
		headers[key] = strings.Join(value, ",")
	}
	queries := make(map[string]string)
	for key, value := range c.Request.URL.Query() {
		queries[key] = strings.Join(value, ",")
	}
	containerType, err := getContainerType(containerName, IDPName)
	if err != nil {
		c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: err.Error(), Redirect: "error"})
	}
	if containerType == "idp" {
		redirectResponse, err := rabbitmq.RabbitMQConnection.SendAuthGetIDPRedirect(
			rabbitmq.GetIDPRedirectMessage{
				ContainerName:  containerName,
				ServerName:     utils.MythicConfig.GlobalServerName,
				IDPName:        IDPName,
				RequestURL:     c.Request.URL.String(),
				RequestCookies: cookies,
				RequestHeaders: headers,
				RequestQuery:   queries,
			})
		if err != nil {
			c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: err.Error(), Status: "error"})
			return
		}
		if !redirectResponse.Success {
			c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: redirectResponse.Error, Status: "error"})
			return
		}
		for key, value := range redirectResponse.RedirectHeaders {
			c.Writer.Header().Add(key, value)
		}
		for key, value := range redirectResponse.RedirectCookies {
			c.SetCookie(key, value, 60, "/", c.Request.Host, true, true)
		}
		c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{
			Status:   "success",
			Redirect: redirectResponse.RedirectURL,
		})
		return
	} else if containerType == "nonidp" {
		redirectResponse, err := rabbitmq.RabbitMQConnection.SendAuthGetNonIDPRedirect(
			rabbitmq.GetNonIDPRedirectMessage{
				ContainerName: containerName,
				ServerName:    utils.MythicConfig.GlobalServerName,
				NonIDPName:    IDPName,
			})
		if err != nil {
			c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: err.Error(), Status: "error"})
			return
		}
		if !redirectResponse.Success {
			c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: redirectResponse.Error, Status: "error"})
			return
		}
		c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{
			Status:        "success",
			RequestFields: redirectResponse.RequestFields,
		})
		return
	}

	c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: "failed to find IDP and Container", Status: "error"})
	return
}

func GetAuthContainerMetadata(c *gin.Context) {
	containerName := c.Param("containerName")
	IDPName := c.Param("IDPName")
	metadata, err := fetchAuthContainerMetadata(containerName, IDPName)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"metadata": metadata,
	})
}
func GetAuthContainerMetadataIDPEndpoint(c *gin.Context) {
	containerName := c.Param("containerName")
	IDPName := c.Param("IDPName")
	metadata, err := fetchAuthContainerMetadata(containerName, IDPName)
	if err != nil {
		c.Abort()
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(metadata))
}
func fetchAuthContainerMetadata(containerName string, idpName string) (string, error) {
	containerType, err := getContainerType(containerName, idpName)
	if err != nil {
		return "", err
	}
	if containerType == "idp" {
		redirectResponse, err := rabbitmq.RabbitMQConnection.SendAuthGetIDPMetadata(
			rabbitmq.GetIDPMetadataMessage{
				ContainerName: containerName,
				ServerName:    utils.MythicConfig.GlobalServerName,
				IDPName:       idpName,
			})
		if err != nil {
			return "", err
		}
		if !redirectResponse.Success {
			return "", errors.New(redirectResponse.Error)
		}
		return redirectResponse.Metadata, nil
	} else if containerType == "nonidp" {
		redirectResponse, err := rabbitmq.RabbitMQConnection.SendAuthGetNonIDPMetadata(
			rabbitmq.GetNonIDPMetadataMessage{
				ContainerName: containerName,
				ServerName:    utils.MythicConfig.GlobalServerName,
				NonIDPName:    idpName,
			})
		if err != nil {
			return "", err
		}
		if !redirectResponse.Success {
			return "", errors.New(redirectResponse.Error)
		}
		return redirectResponse.Metadata, nil
	}
	return "", errors.New("Failed to find IDP and Container")
}

type nonIDPProcessResponseData struct {
	RequestFields map[string]string `json:"request_fields"`
}

func ProcessIDPResponse(c *gin.Context) {
	containerName := c.Param("containerName")
	IDPName := c.Param("IDPName")

	containerType, err := getContainerType(containerName, IDPName)
	if err != nil {
		c.JSON(http.StatusOK, GetAuthContainerRedirectResponse{Error: err.Error(), Redirect: "error"})
	}
	var SuccessfulAuthentication bool
	var Email string
	var Error string
	if containerType == "idp" {
		cookies := make(map[string]string)
		for _, cookie := range c.Request.Cookies() {
			cookies[cookie.Name] = cookie.String()
		}
		headers := make(map[string]string)
		for key, value := range c.Request.Header {
			headers[key] = strings.Join(value, ",")
		}
		queries := make(map[string]string)
		for key, value := range c.Request.URL.Query() {
			queries[key] = strings.Join(value, ",")
		}
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"error": err.Error()})
			return
		}
		c.Request.Body.Close()
		redirectResponse, err := rabbitmq.RabbitMQConnection.SendAuthProcessIDPResponse(
			rabbitmq.ProcessIDPResponseMessage{
				ContainerName:  containerName,
				ServerName:     utils.MythicConfig.GlobalServerName,
				IDPName:        IDPName,
				RequestURL:     c.Request.URL.String(),
				RequestCookies: cookies,
				RequestHeaders: headers,
				RequestQuery:   queries,
				RequestBody:    string(body),
			})
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"error": "failed to send IDP Redirect request"})
			return
		}
		SuccessfulAuthentication = redirectResponse.SuccessfulAuthentication
		Email = redirectResponse.Email
		Error = redirectResponse.Error
	} else if containerType == "nonidp" {
		var input nonIDPProcessResponseData
		err = c.ShouldBindJSON(&input)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"error": err.Error()})
			return
		}
		redirectResponse, err := rabbitmq.RabbitMQConnection.SendAuthProcessNonIDPResponse(
			rabbitmq.ProcessNonIDPResponseMessage{
				ContainerName: containerName,
				ServerName:    utils.MythicConfig.GlobalServerName,
				NonIDPName:    IDPName,
				RequestValues: input.RequestFields,
			})
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"error": "failed to send IDP Redirect request"})
			return
		}
		SuccessfulAuthentication = redirectResponse.SuccessfulAuthentication
		Email = redirectResponse.Email
		Error = redirectResponse.Error
	}

	accessToken, refreshToken, userID, err := authentication.ValidateCustomAuthProviderLogin(Email, Error,
		SuccessfulAuthentication, c.ClientIP(), containerName, IDPName)
	if err != nil {
		logging.LogError(err, "Failed Authentication")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	currentOperation, err := database.GetUserCurrentOperation(userID)
	if err != nil {
		logging.LogError(err, "Failed get operation")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	user := map[string]interface{}{
		"current_operation":    currentOperation.CurrentOperation.Name,
		"current_operation_id": currentOperation.CurrentOperation.ID,
		"username":             currentOperation.CurrentOperator.Username,
		"id":                   currentOperation.CurrentOperator.ID,
		"user_id":              currentOperation.CurrentOperator.ID,
	}
	// setting cookie max age to 2 days
	c.SetCookie("mythic", accessToken, 60*60*24*2, "/", strings.Split(c.Request.Host, ":")[0], true, true)
	jsonData, err := json.Marshal(map[string]interface{}{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}
	c.SetCookie("user", base64.StdEncoding.EncodeToString(jsonData), 10, "/", strings.Split(c.Request.Host, ":")[0], true, false)
	c.SetSameSite(http.SameSiteStrictMode)
	c.Redirect(http.StatusFound, "/new/login")
}
func getContainerType(containerName string, IDPName string) (string, error) {
	consumingService := databaseStructs.ConsumingContainer{}
	err := database.DB.Get(&consumingService, `SELECT * FROM consuming_container 
         WHERE name=$1 AND type='auth' AND container_running=true AND deleted=false`,
		containerName)
	if err != nil {
		return "", err
	}
	subscriptionsArray := consumingService.Subscriptions.StructStringValue()
	subscriptionsStructArray := make([]AuthSubscriptions, len(subscriptionsArray))
	for i, subscription := range subscriptionsArray {
		err = json.Unmarshal([]byte(subscription), &subscriptionsStructArray[i])
		if err != nil {
			return "", err
		}
	}
	for _, sub := range subscriptionsStructArray {
		if sub.Name == IDPName {
			return sub.Type, nil
		}
	}
	return "", errors.New("container type not found")
}
