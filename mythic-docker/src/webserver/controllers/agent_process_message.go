package webcontroller

import (
	"fmt"
	"io/ioutil"
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
	if agentMessage, err := ioutil.ReadAll(c.Request.Body); err != nil {
		logging.LogError(err, "Failed to read body of agent message")
		errorMessage := "Error! Failed to read body of agent message. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
		go database.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_body", database.MESSAGE_LEVEL_WARNING)
		c.JSON(http.StatusNotFound, gin.H{})
		return
	} else if c2Header := c.GetHeader("mythic"); c2Header == "" {
		logging.LogError(err, "Failed to get 'mythic' header")
		errorMessage := "Error! Failed to find Mythic header. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
		errorMessage += "Did this come from a Mythic C2 Profile? If so, make sure it's adding the `mythic` header with the name of the C2 profile"
		go database.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
		c.JSON(http.StatusNotFound, gin.H{})
		return
	} else if response, err := rabbitmq.ProcessAgentMessage(rabbitmq.AgentMessageRawInput{
		C2Profile:  c2Header,
		RawMessage: agentMessage,
		RemoteIP:   requestIp,
	}); err != nil {
		c.JSON(http.StatusNotFound, gin.H{})
		return
	} else {
		c.Data(http.StatusOK, "application/octet-stream", response)
		return
	}
}

func AgentMessageGetWebhook(c *gin.Context) {
	// get variables from the POST request
	requestUrl := c.Request.URL.RawPath
	if forwardedURL := c.GetHeader("x-forwarded-url"); forwardedURL != "" {
		requestUrl = forwardedURL
	}
	requestIp := c.ClientIP()
	if c2Header := c.GetHeader("mythic"); c2Header == "" {
		logging.LogError(nil, "Failed to get 'mythic' header")
		errorMessage := "Error! Failed to find Mythic header. Check the following details for more information about the request:\nConnection to: "
		errorMessage += fmt.Sprintf("/%s via HTTP %s\nFrom: %s\n", requestUrl, c.Request.Method, requestIp)
		errorMessage += "Did this come from a Mythic C2 Profile? If so, make sure it's adding the `mythic` header with the name of the C2 profile"
		go database.SendAllOperationsMessage(errorMessage, 0, "agent_message_missing_mythic_header", database.MESSAGE_LEVEL_WARNING)
		c.JSON(http.StatusNotFound, gin.H{})
		return
	} else {
		params := c.Request.URL.Query()
		for key, _ := range params {
			agentMessage := params.Get(key)
			if response, err := rabbitmq.ProcessAgentMessage(rabbitmq.AgentMessageRawInput{
				C2Profile:  c2Header,
				RawMessage: []byte(agentMessage),
				RemoteIP:   requestIp,
			}); err != nil {
				c.JSON(http.StatusNotFound, gin.H{})
				return
			} else {
				c.Data(http.StatusOK, "application/octet-stream", response)
				return
			}
		}
	}

}
