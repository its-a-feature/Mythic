package webcontroller

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type GetC2SampleMessageInput struct {
	Input GetC2SampleMessage `json:"input" binding:"required"`
}

type GetC2SampleMessage struct {
	PayloadUUID string `json:"uuid" binding:"required"`
}

type GetC2SampleMessageResponse struct {
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error"`
}

func C2ProfileSampleMessageWebhook(c *gin.Context) {
	// get variables from the POST request
	var input GetC2SampleMessageInput
	output := ""
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, GetC2SampleMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT id FROM payload WHERE uuid=$1`, input.Input.PayloadUUID); err != nil {
		logging.LogError(err, "Failed to find payload when doing a C2ProfileConfigCheckWebhook")
	}
	c2profileParameterInstances := []databaseStructs.C2profileparametersinstance{}
	if err := database.DB.Select(&c2profileParameterInstances, `SELECT 
	c2profile.name "c2profile.name",
	c2profile.id "c2profile.id",
	"value", enc_key, dec_key,
	c2profileparameters.crypto_type "c2profileparameters.crypto_type", 
	c2profileparameters.parameter_type "c2profileparameters.parameter_type",
	c2profileparameters.name "c2profileparameters.name",
	c2profileparameters.choices "c2profileparameters.choices"
	FROM c2profileparametersinstance 
	JOIN c2profileparameters ON c2profileparametersinstance.c2_profile_parameters_id = c2profileparameters.id 
	JOIN c2profile ON c2profileparametersinstance.c2_profile_id = c2profile.id
	WHERE payload_id=$1`, payload.ID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile parameters from database for payload", "payload_id", payload.ID)
		c.JSON(http.StatusOK, GetC2ConfigCheckResponse{
			Status: "error",
			Error:  "Failed to find C2 Profile Parameters",
		})
		return
	}
	parametersMap := make(map[string][]databaseStructs.C2profileparametersinstance)
	for _, parameter := range c2profileParameterInstances {
		if _, ok := parametersMap[parameter.C2Profile.Name]; ok {
			// we've already seen parameter.C2Profile.Name before, add to the array
			parametersMap[parameter.C2Profile.Name] = append(parametersMap[parameter.C2Profile.Name], parameter)
		} else {
			// we haven't seen parameter.C2Profile.Name before, create the array
			parametersMap[parameter.C2Profile.Name] = []databaseStructs.C2profileparametersinstance{parameter}
		}
	}
	for c2ProfileName, c2ProfileGroup := range parametersMap {
		parametersValueDictionary := make(map[string]interface{})
		for _, parameter := range c2ProfileGroup {
			if val, err := rabbitmq.GetInterfaceValueForContainer(parameter.C2ProfileParameter.ParameterType, parameter.Value, parameter.EncKey, parameter.DecKey, parameter.C2ProfileParameter.IsCryptoType); err != nil {
				logging.LogError(err, "Failed to get interface value for container from c2 profile instance parameter")
			} else {
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = val
			}
		}
		// now that the parameter dictionary is created, send it along for the RPC call
		if c2GetSampleMessageResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCSampleMessage(rabbitmq.C2SampleMessageMessage{
			Name:       c2ProfileName,
			Parameters: parametersValueDictionary,
		}); err != nil {
			logging.LogError(err, "Failed to send RPC call to c2 profile in C2ProfileSampleMessageWebhook", "c2_profile", c2ProfileName)
			output += fmt.Sprintf("Failed to get IOCs for %s\n%s\n", c2ProfileName, err.Error())
		} else if !c2GetSampleMessageResponse.Success {
			output += fmt.Sprintf("Failed to generate sample message for %s\n%s\n", c2ProfileName, c2GetSampleMessageResponse.Error)
		} else {
			output += fmt.Sprintf("Sample Message for %s\n%s\n", c2ProfileName, c2GetSampleMessageResponse.Message)
		}
	}
	c.JSON(http.StatusOK, GetC2SampleMessageResponse{
		Status: "success",
		Output: output,
	})
	return
}
