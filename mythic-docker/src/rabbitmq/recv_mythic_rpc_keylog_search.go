package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/mitchellh/mapstructure"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCKeylogSearchMessage struct {
	SearchKeylogs MythicRPCKeylogSearchKeylogData `json:"keylogs"`
}
type MythicRPCKeylogSearchMessageResponse struct {
	Success bool                              `json:"success"`
	Error   string                            `json:"error"`
	Keylogs []MythicRPCKeylogSearchKeylogData `json:"keylogs"`
}
type MythicRPCKeylogSearchKeylogData struct {
	User        *string `json:"user" mapstructure:"user"`             // optional
	WindowTitle *string `json:"window_title" mapstructure:"window"`   // optional
	Keystrokes  *[]byte `json:"keystrokes" mapstructure:"keystrokes"` // optional
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_KEYLOG_SEARCH,
		RoutingKey: MYTHIC_RPC_KEYLOG_SEARCH,
		Handler:    processMythicRPCKeylogSearch,
		Scopes:     []string{mythicjwt.SCOPE_RESPONSE_READ},
	})
}

// Endpoint: MYTHIC_RPC_KEYLOG_SEARCH
func MythicRPCKeylogSearch(input MythicRPCKeylogSearchMessage, authContext RabbitMQAuthContext) MythicRPCKeylogSearchMessageResponse {
	response := MythicRPCKeylogSearchMessageResponse{
		Success: false,
	}
	paramDict := make(map[string]interface{})
	keylogs := []databaseStructs.Keylog{}
	paramDict["operation_id"] = authContext.OperationID
	searchString := `SELECT * FROM keylog WHERE operation_id=:operation_id  `
	if input.SearchKeylogs.User != nil {
		paramDict["user"] = "%" + *input.SearchKeylogs.User + "%"
		searchString += "AND user ILIKE :user "
	}
	if input.SearchKeylogs.WindowTitle != nil {
		paramDict["window_title"] = "%" + *input.SearchKeylogs.WindowTitle + "%"
		searchString += "AND window ILIKE :window_title "
	}
	if input.SearchKeylogs.Keystrokes != nil {
		paramDict["keystrokes"] = "%" + string(*input.SearchKeylogs.Keystrokes) + "%"
		searchString += "AND keystrokes LIKE :keystrokes "
	}
	searchString += " ORDER BY id DESC"
	err := database.DB.Select(&keylogs, searchString, paramDict)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	returnedProcesses := []MythicRPCKeylogSearchKeylogData{}
	err = mapstructure.Decode(keylogs, &returnedProcesses)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	response.Success = true
	response.Keylogs = returnedProcesses
	return response
}
func processMythicRPCKeylogSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCKeylogSearchMessage{}
	responseMsg := MythicRPCKeylogSearchMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCKeylogSearch(incomingMessage, authContext)
}
