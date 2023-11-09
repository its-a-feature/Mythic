package webcontroller

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// flow:
/*
1. Get agent message
2. Base64 decode agent message
3. parse out UUID and body
4. Look up UUID to see if payload, callback, or staging piece
4. a. look up associated payload type
4. b. send off to translation container for processing if needed
5. look at "action" and process message
6. get response from processing the action
7. encrypt response (or send to translation container for processing if needed)
8. add UUID and base64 encode message
9. return message response
*/

func AgentMessageWebhook(c *gin.Context) {
	// get variables from the POST request
	requestUrl := c.Request.URL.RawPath
	if forwardedURL := c.GetHeader("x-forwarded-url"); forwardedURL != "" {
		requestUrl = forwardedURL
	}
	requestIp := c.ClientIP()
	defer c.Request.Body.Close()
	agentMessage, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logging.LogError(err, "Failed to read body of agent message")
		errorMessage := "Error! Failed to read body of agent message. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_body", database.MESSAGE_LEVEL_WARNING)
		c.Status(http.StatusNotFound)
		return
	}
	c2Header := c.GetHeader("mythic")
	if c2Header == "" {
		logging.LogError(err, "Failed to get 'mythic' header")
		errorMessage := "Error! Failed to find Mythic header. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
		errorMessage += "Did this come from a Mythic C2 Profile? If so, make sure it's adding the `mythic` header with the name of the C2 profile"
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
		c.Status(http.StatusNotFound)
		return
	}
	response, err := rabbitmq.ProcessAgentMessage(rabbitmq.AgentMessageRawInput{
		C2Profile:         c2Header,
		Base64Message:     &agentMessage,
		RemoteIP:          requestIp,
		Base64Response:    true,
		UpdateCheckinTime: true,
	})
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	c.Data(http.StatusOK, "application/octet-stream", response)
	return

}

func AgentMessageGetWebhook(c *gin.Context) {
	// get variables from the GET request
	// first check for first query param
	// then check for first cookie
	// finally check for request body
	requestUrl := c.Request.URL.String()
	if forwardedURL := c.GetHeader("x-forwarded-url"); forwardedURL != "" {
		requestUrl = forwardedURL
	}
	requestIp := c.ClientIP()
	c2Header := c.GetHeader("mythic")
	if c2Header == "" {
		logging.LogError(nil, "Failed to get 'mythic' header")
		errorMessage := "Error! Failed to find Mythic header. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
		errorMessage += "Did this come from a Mythic C2 Profile? If so, make sure it's adding the `mythic` header with the name of the C2 profile"
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
		c.Status(http.StatusNotFound)
		return
	}
	params := c.Request.URL.Query()
	cookies := c.Request.Cookies()
	defer c.Request.Body.Close()
	if len(params) > 0 {
		for key, _ := range params {
			agentMessage := params.Get(key)
			base64Bytes, err := base64.URLEncoding.DecodeString(agentMessage)
			if err != nil {
				base64Bytes, err = base64.StdEncoding.DecodeString(agentMessage)
				if err != nil {
					errorMessage := "Error! Failed to base64 decode url encoded query parameter. Check the following details for more information about the request:\nConnection to: "
					errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
					logging.LogError(err, "Failed to base64 decode url encoded query parameter", "param key", key)
					go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "base64_decode_error", database.MESSAGE_LEVEL_WARNING)
					c.Status(http.StatusNotFound)
					return
				}
			}
			if response, err := rabbitmq.ProcessAgentMessage(rabbitmq.AgentMessageRawInput{
				C2Profile:         c2Header,
				RawMessage:        &base64Bytes,
				RemoteIP:          requestIp,
				Base64Response:    true,
				UpdateCheckinTime: true,
			}); err != nil {
				logging.LogError(err, "Failed to process url encoded agent message")
				c.Status(http.StatusNotFound)
				return
			} else {
				c.Data(http.StatusOK, "application/octet-stream", response)
				return
			}

		}
	}
	if len(cookies) > 0 {
		agentMessage := cookies[0].Value
		if base64Bytes, err := base64.StdEncoding.DecodeString(agentMessage); err != nil {
			errorMessage := "Error! Failed to base64 decode cookie parameter. Check the following details for more information about the request:\nConnection to: "
			errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nCookie: %v\n", requestUrl, c.Request.Method, requestIp, cookies[0])
			go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
			logging.LogError(err, "Failed to base64 decode cookie value", "cookie key", cookies[0].Name)
			c.Status(http.StatusNotFound)
			return
		} else {
			if response, err := rabbitmq.ProcessAgentMessage(rabbitmq.AgentMessageRawInput{
				C2Profile:         c2Header,
				RawMessage:        &base64Bytes,
				RemoteIP:          requestIp,
				Base64Response:    true,
				UpdateCheckinTime: true,
			}); err != nil {
				logging.LogError(err, "Failed to process agent message from cookie")
				c.Status(http.StatusNotFound)
				return
			} else {
				c.Data(http.StatusOK, "application/octet-stream", response)
				return
			}
		}
	}
	if agentMessage, err := io.ReadAll(c.Request.Body); err != nil {
		if response, err := rabbitmq.ProcessAgentMessage(rabbitmq.AgentMessageRawInput{
			C2Profile:         c2Header,
			Base64Message:     &agentMessage,
			RemoteIP:          requestIp,
			Base64Response:    true,
			UpdateCheckinTime: true,
		}); err != nil {
			errorMessage := "Error! Failed to find message in body of get request. Check the following details for more information about the request:\nConnection to: "
			errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
			go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
			logging.LogError(err, "Failed to process agent message in body of get request")
			c.Status(http.StatusNotFound)
			return
		} else {
			c.Data(http.StatusOK, "application/octet-stream", response)
			return
		}
	}
	logging.LogError(nil, "Failed to find query param, cookie, or message body ")
	c.Status(http.StatusNotFound)
	return
}
