package rabbitmq

import (
	"errors"
	"fmt"

	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
)

func handleAgentMessageUpdateInfo(incoming *map[string]interface{}, uUIDInfo *cachedUUIDInfo) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "update_info"
		}
	*/
	response := map[string]interface{}{}
	agentMessage := agentMessageCheckin{}
	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into struct: %s", err.Error()))
	} else {

	}
	response["status"] = "success"
	response["id"] = uUIDInfo.UUID
	reflectBackOtherKeys(&response, &agentMessage.Other)
	return response, nil
}
