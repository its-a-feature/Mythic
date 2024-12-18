package webcontroller

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"

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
func requestGetRemoteAddress(c *gin.Context) string {
	//logging.LogInfo("request headers", "headers", c.Request.Header)
	CFConnectingIP := c.Request.Header.Get("CF-Connecting-IP")
	if CFConnectingIP != "" {
		return CFConnectingIP
	}
	XRealIP := c.Request.Header.Get("X-Real-Ip")
	if XRealIP != "" {
		return XRealIP
	}
	XForwardedFor := c.Request.Header.Get("X-Forwarded-For")
	if XForwardedFor == "" {
		return c.ClientIP()
	}
	// X-Forwarded-For may contain a comma-separated list of addresses
	parts := strings.Split(XForwardedFor, ",")
	for i, p := range parts {
		parts[i] = strings.TrimSpace(p)
	}
	if len(parts) > 0 {
		return parts[0]
	}
	return "127.0.0.1"
}
func requestGetRemoteURL(c *gin.Context) string {
	requestUrl := c.Request.URL.RawPath
	if forwardedURL := c.GetHeader("x-forwarded-url"); forwardedURL != "" {
		requestUrl = forwardedURL
	}
	return requestUrl
}
func requestGetRemoteUserAgent(c *gin.Context) string {
	requestUserAgent := c.Request.UserAgent()
	if forwardedUserAgent := c.GetHeader("x-forwarded-user-agent"); forwardedUserAgent != "" {
		requestUserAgent = forwardedUserAgent
	}
	return requestUserAgent
}
func requestGetRemoteHost(c *gin.Context) string {
	requestHost := c.Request.Host
	if forwardedHost := c.GetHeader("X-Forwarded-Host"); forwardedHost != "" {
		requestHost = forwardedHost
	}
	return requestHost
}
func AgentMessageWebhook(c *gin.Context) {
	// get variables from the POST request
	requestUrl := requestGetRemoteURL(c)
	requestUserAgent := requestGetRemoteUserAgent(c)
	requestIp := requestGetRemoteAddress(c)
	agentMessage, err := io.ReadAll(c.Request.Body)
	c.Request.Body.Close()
	if err != nil {
		logging.LogError(err, "Failed to read body of agent message")
		errorMessage := "Error! Failed to read body of agent message. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n", requestUrl, c.Request.Method, requestIp, requestUserAgent)
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_body", database.MESSAGE_LEVEL_WARNING)
		c.Status(http.StatusNotFound)
		return
	}
	c2Header := c.GetHeader("mythic")
	if c2Header == "" {
		logging.LogError(err, "Failed to get 'mythic' header")
		errorMessage := "Error! Failed to find Mythic header. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n", requestUrl, c.Request.Method, requestIp, requestUserAgent)
		errorMessage += "Did this come from a Mythic C2 Profile? If so, make sure it's adding the `mythic` header with the name of the C2 profile"
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
		c.Status(http.StatusNotFound)
		return
	}
	//logging.LogInfo("got post agent message", "size", len(agentMessage))
	response, err := rabbitmq.ProcessAgentMessage(&rabbitmq.AgentMessageRawInput{
		C2Profile:         c2Header,
		Base64Message:     &agentMessage,
		RemoteIP:          requestIp,
		Base64Response:    true,
		UpdateCheckinTime: true,
	})
	if err != nil {
		errorMessage := "Error! Failed to process agent message. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n%v\n", requestUrl, c.Request.Method, requestIp, requestUserAgent, err)
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_bad_message", database.MESSAGE_LEVEL_WARNING)
		logging.LogError(err, "Failed to process agent message in body of post request", "errorMsg", errorMessage)
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
	requestUrl := requestGetRemoteURL(c)
	requestUserAgent := requestGetRemoteUserAgent(c)
	requestIp := requestGetRemoteAddress(c)
	c2Header := c.GetHeader("mythic")
	if c2Header == "" {
		errorMessage := "Error! Failed to find Mythic header. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n", requestUrl, c.Request.Method, requestIp, requestUserAgent)
		errorMessage += "Did this come from a Mythic C2 Profile? If so, make sure it's adding the `mythic` header with the name of the C2 profile"
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
		logging.LogError(nil, errorMessage)
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
					errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n%v\n", requestUrl, c.Request.Method, requestIp, requestUserAgent, err)
					logging.LogError(err, "Failed to base64 decode url encoded query parameter", "param key", key, "errorMsg", errorMessage)
					go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "base64_decode_error", database.MESSAGE_LEVEL_WARNING)
					c.Status(http.StatusNotFound)
					return
				}
			}
			if response, err := rabbitmq.ProcessAgentMessage(&rabbitmq.AgentMessageRawInput{
				C2Profile:         c2Header,
				RawMessage:        &base64Bytes,
				RemoteIP:          requestIp,
				Base64Response:    true,
				UpdateCheckinTime: true,
			}); err != nil {
				errorMessage := "Error! Failed to process url encoded query parameter. Check the following details for more information about the request:\nConnection to: "
				errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n%v\n", requestUrl, c.Request.Method, requestIp, requestUserAgent, err)
				go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "", database.MESSAGE_LEVEL_WARNING)
				logging.LogError(err, "Failed to process url encoded agent message", "agentMessage", string(base64Bytes), "errorMsg", errorMessage)
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
			errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nCookie: %v\n:%vUser-Agent: %s\n\n", requestUrl, c.Request.Method, requestIp, cookies[0], requestUserAgent, err)
			go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_bad_cookie", database.MESSAGE_LEVEL_WARNING)
			logging.LogError(err, "Failed to base64 decode cookie value", "cookie key", cookies[0].Name, "errorMsg", errorMessage)
			c.Status(http.StatusNotFound)
			return
		} else {
			if response, err := rabbitmq.ProcessAgentMessage(&rabbitmq.AgentMessageRawInput{
				C2Profile:         c2Header,
				RawMessage:        &base64Bytes,
				RemoteIP:          requestIp,
				Base64Response:    true,
				UpdateCheckinTime: true,
			}); err != nil {
				errorMessage := "Error! Failed to process cookie parameter. Check the following details for more information about the request:\nConnection to: "
				errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nCookie: %v\nUser-Agent: %s\n%v\n", requestUrl, c.Request.Method, requestIp, cookies[0], requestUserAgent, err)
				go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_bad_cookie", database.MESSAGE_LEVEL_WARNING)
				logging.LogError(err, "Failed to process cookie value", "cookie key", cookies[0].Name, "errorMsg", errorMessage)
				c.Status(http.StatusNotFound)
				return
			} else {
				c.Data(http.StatusOK, "application/octet-stream", response)
				return
			}
		}
	}
	agentMessage, err := io.ReadAll(c.Request.Body)
	c.Request.Body.Close()
	if err != nil {
		errorMessage := "Error! Failed to find query param, cookie, or message body. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n", requestUrl, c.Request.Method, requestIp, requestUserAgent)
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_message", database.MESSAGE_LEVEL_WARNING)
		logging.LogError(nil, "Failed to process agent message", "errorMsg", errorMessage)
		c.Status(http.StatusNotFound)
		return
	}
	if response, err := rabbitmq.ProcessAgentMessage(&rabbitmq.AgentMessageRawInput{
		C2Profile:         c2Header,
		Base64Message:     &agentMessage,
		RemoteIP:          requestIp,
		Base64Response:    true,
		UpdateCheckinTime: true,
	}); err != nil {
		errorMessage := "Error! Failed to find message in body of get request. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\nUser-Agent: %s\n%v\n", requestUrl, c.Request.Method, requestIp, requestUserAgent, err)
		go rabbitmq.SendAllOperationsMessage(errorMessage, 0, "agent_message_bad_message", database.MESSAGE_LEVEL_WARNING)
		logging.LogError(err, "Failed to process agent message in body of get request", "errorMsg", errorMessage)
		c.Status(http.StatusNotFound)
		return
	} else {
		c.Data(http.StatusOK, "application/octet-stream", response)
		return
	}

}
