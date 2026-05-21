package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils/structs"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTagTypeGetOrCreateMessage struct {
	TaskID                        int     `json:"task_id"`
	GetOrCreateTagTypeID          *int    `json:"get_or_create_tag_type_id"`
	GetOrCreateTagTypeName        *string `json:"get_or_create_tag_type_name"`
	GetOrCreateTagTypeDescription *string `json:"get_or_create_tag_type_description"`
	GetOrCreateTagTypeColor       *string `json:"get_or_create_tag_type_color"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTagTypeGetOrCreateMessageResponse struct {
	Success bool                 `json:"success"`
	Error   string               `json:"error"`
	TagType MythicRPCTagTypeData `json:"tagtype"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TAGTYPE_GET_OR_CREATE,   // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TAGTYPE_GET_OR_CREATE,   // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTagtypeGetOrCreate, // points to function that takes in amqp.Delivery and returns interface{}
		Scopes:     []string{mythicjwt.SCOPE_TAG_WRITE},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTagtypeGetOrCreate(input MythicRPCTagTypeGetOrCreateMessage, authContext RabbitMQAuthContext) MythicRPCTagTypeGetOrCreateMessageResponse {
	response := MythicRPCTagTypeGetOrCreateMessageResponse{
		Success: false,
	}
	tt := databaseStructs.TagType{
		Operation: authContext.OperationID,
	}
	if authContext.APITokensID > 0 {
		tt.APITokensID = structs.NullInt64{}
		tt.APITokensID.Valid = true
		tt.APITokensID.Int64 = int64(authContext.APITokensID)
	}
	if authContext.EventStepInstanceID > 0 {
		tt.EventStepInstanceID = structs.NullInt64{}
		tt.EventStepInstanceID.Valid = true
		tt.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	paramDict := make(map[string]interface{})
	paramDict["operation_id"] = authContext.OperationID
	searchString := `SELECT * FROM tagtype WHERE operation_id=:operation_id `
	if input.GetOrCreateTagTypeID != nil {
		searchString += `AND id=:id `
		paramDict["id"] = *input.GetOrCreateTagTypeID
		tt.ID = *input.GetOrCreateTagTypeID
	}
	if input.GetOrCreateTagTypeName != nil {
		searchString += `AND name ILIKE :name `
		paramDict["name"] = "%" + *input.GetOrCreateTagTypeName + "%"
		tt.Name = *input.GetOrCreateTagTypeName
	}
	if input.GetOrCreateTagTypeDescription != nil {
		searchString += `AND description ILIKE :description `
		paramDict["description"] = "%" + *input.GetOrCreateTagTypeDescription + "%"
		tt.Description = *input.GetOrCreateTagTypeDescription
	}
	if input.GetOrCreateTagTypeColor != nil {
		searchString += `AND color=:color `
		paramDict["color"] = *input.GetOrCreateTagTypeColor
		tt.Color = *input.GetOrCreateTagTypeColor
	}

	statement, err := database.DB.PrepareNamed(searchString)
	if err != nil {
		logging.LogError(err, "Failed to make named statement when searching for tagtypes")
		response.Error = err.Error()
		return response
	}
	err = statement.Get(&tt, paramDict)
	if errors.Is(err, sql.ErrNoRows) {
		if input.GetOrCreateTagTypeName == nil || *input.GetOrCreateTagTypeName == "" {
			response.Success = false
			response.Error = "failed to find tagtype and no name provided to create one"
			return response
		}
		statement, err = database.DB.PrepareNamed(`INSERT INTO tagtype 
				(name, description, color, operation_id, apitokens_id, eventstepinstance_id)
				VALUES (:name, :description, :color, :operation_id, :apitokens_id, :eventstepinstance_id)
				RETURNING id`)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		err = statement.Get(&tt.ID, tt)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		response.TagType = getTagTypeDataFromDatabaseTagType(tt)
		return response
	}
	if err != nil {
		logging.LogError(err, "Failed to exec sqlx.IN modified statement")
		response.Error = err.Error()
		return response
	}
	response.TagType = getTagTypeDataFromDatabaseTagType(tt)
	response.Success = true
	return response
}
func getTagTypeDataFromDatabaseTagType(tt databaseStructs.TagType) MythicRPCTagTypeData {
	ttd := MythicRPCTagTypeData{
		ID:          tt.ID,
		Name:        tt.Name,
		Description: tt.Description,
		Color:       tt.Color,
		OperationID: tt.Operation,
	}
	return ttd
}
func processMythicRPCTagtypeGetOrCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTagTypeGetOrCreateMessage{}
	responseMsg := MythicRPCTagTypeGetOrCreateMessageResponse{
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
	return MythicRPCTagtypeGetOrCreate(incomingMessage, authContext)
}
