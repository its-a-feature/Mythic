package rabbitmq

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCustomBrowserSearchMessage struct {
	TaskID                 *int                             `json:"task_id"`
	OperationID            *int                             `json:"operation_id"`
	GetAllMatchingChildren bool                             `json:"all_matching_children"`
	SearchCustomBrowser    MythicRPCCustomBrowserSearchData `json:"custombrowser"`
}
type MythicRPCCustomBrowserSearchMessageResponse struct {
	Success              bool                                       `json:"success"`
	Error                string                                     `json:"error"`
	CustomBrowserEntries []MythicRPCCustomBrowserSearchDataResponse `json:"custombrowser"`
}
type MythicRPCCustomBrowserSearchData struct {
	TreeType      string      `json:"tree_type" mapstructure:"tree_type"`
	Host          *string     `json:"host" mapstructure:"host"`
	Name          *string     `json:"name" mapstructure:"name"`
	ParentPath    *string     `json:"parent_path" mapstructure:"parent_path"`
	FullPath      *string     `json:"full_path" mapstructure:"full_path"`
	MetadataKey   *string     `json:"metadata_key" mapstructure:"metadata_key"`
	MetadataValue interface{} `json:"metadata_value" mapstructure:"metadata_value"`
}
type MythicRPCCustomBrowserSearchDataResponse struct {
	TreeType   string                 `json:"tree_type" mapstructure:"tree_type"`
	Host       string                 `json:"host" mapstructure:"host"`
	Name       string                 `json:"name" mapstructure:"name"`
	ParentPath string                 `json:"parent_path" mapstructure:"parent_path"`
	FullPath   string                 `json:"full_path" mapstructure:"full_path"`
	Metadata   map[string]interface{} `json:"metadata" mapstructure:"metadata"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      CUSTOMBROWSER_SEARCH,
		RoutingKey: CUSTOMBROWSER_SEARCH,
		Handler:    processMythicRPCCustomBrowserSearch,
	})
}

// Endpoint: MYTHIC_RPC_PROCESS_SEARCH
func MythicRPCCustomBrowserSearch(input MythicRPCCustomBrowserSearchMessage) MythicRPCCustomBrowserSearchMessageResponse {
	response := MythicRPCCustomBrowserSearchMessageResponse{
		Success:              false,
		CustomBrowserEntries: []MythicRPCCustomBrowserSearchDataResponse{},
	}
	paramDict := make(map[string]interface{})
	if input.TaskID != nil {
		task := databaseStructs.Task{}
		err := database.DB.Get(&task, `SELECT 
			task.id, task.operation_id
			FROM task
			WHERE task.id=$1`, *input.TaskID)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		paramDict["operation_id"] = task.OperationID
	} else if input.OperationID != nil {
		paramDict["operation_id"] = *input.OperationID
	} else {
		logging.LogError(nil, "must provide task_id or operation_id")
		response.Error = "must provide task_id or operation_id"
		return response
	}
	paramDict["tree_type"] = input.SearchCustomBrowser.TreeType
	searchString := `SELECT * FROM mythictree 
         WHERE operation_id=:operation_id AND tree_type=:tree_type AND deleted=false `
	if input.SearchCustomBrowser.Host != nil {
		paramDict["host"] = fmt.Sprintf("%%%s%%", *input.SearchCustomBrowser.Host)
		searchString += "AND host ILIKE :host "
	}
	if input.SearchCustomBrowser.Name != nil {
		paramDict["name"] = fmt.Sprintf("%%%s%%", *input.SearchCustomBrowser.Name)
		searchString += "AND \"name\" LIKE :name "
	}
	if input.SearchCustomBrowser.ParentPath != nil {
		if input.GetAllMatchingChildren {
			paramDict["parent_path"] = fmt.Sprintf("%s%%", *input.SearchCustomBrowser.ParentPath)
			searchString += "AND (parent_path LIKE :parent_path OR display_path LIKE :parent_path) "
		} else {
			paramDict["parent_path"] = fmt.Sprintf("%s", *input.SearchCustomBrowser.ParentPath)
			searchString += "AND (parent_path=:parent_path OR display_path=:parent_path) "
		}
		paramDict["parent_path"] = strings.ReplaceAll(paramDict["parent_path"].(string), "\\", "\\\\")

	}
	if input.SearchCustomBrowser.FullPath != nil {
		if input.GetAllMatchingChildren {
			paramDict["full_path"] = fmt.Sprintf("%%%s%%", *input.SearchCustomBrowser.FullPath)
			searchString += "AND (full_path LIKE :full_path OR display_path LIKE :full_path) "
		} else {
			paramDict["full_path"] = fmt.Sprintf("%s", *input.SearchCustomBrowser.FullPath)
			searchString += "AND (full_path=:full_path OR display_path=:full_path) "
		}
		paramDict["full_path"] = strings.ReplaceAll(paramDict["full_path"].(string), "\\", "\\\\")

	}
	if input.SearchCustomBrowser.MetadataKey != nil {
		searchString += "AND metadata->:metadata_key "
		paramDict["metadata_key"] = *input.SearchCustomBrowser.MetadataKey
		if input.SearchCustomBrowser.MetadataValue != nil {
			searchString += " = :metadata_value "
			paramDict["metadata_value"] = input.SearchCustomBrowser.MetadataValue
		} else {
			searchString += " is not null "
		}
	}

	searchString += " ORDER BY id DESC"
	logging.LogInfo("searching", "searchString", searchString, "paramDict", paramDict)
	rows, err := database.DB.NamedQuery(searchString, paramDict)
	if err != nil {
		logging.LogError(err, "Failed to search custombrowser information")
		response.Error = err.Error()
		return response
	}
	for rows.Next() {
		searchResult := databaseStructs.MythicTree{}
		err = rows.StructScan(&searchResult)
		if err != nil {
			logging.LogError(err, "Failed to get row from mythic tree for search")
			continue
		}
		logging.LogInfo("found match", "match", searchResult)
		returnedProcess := MythicRPCCustomBrowserSearchDataResponse{
			TreeType:   searchResult.TreeType,
			Host:       searchResult.Host,
			Name:       string(searchResult.Name),
			ParentPath: string(searchResult.ParentPath),
			FullPath:   string(searchResult.FullPath),
			Metadata:   searchResult.Metadata.StructValue(),
		}
		response.CustomBrowserEntries = append(response.CustomBrowserEntries, returnedProcess)
	}
	response.Success = true
	logging.LogInfo("searched successfully", "response", response)
	return response
}
func processMythicRPCCustomBrowserSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCustomBrowserSearchMessage{}
	responseMsg := MythicRPCCustomBrowserSearchMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCCustomBrowserSearch(incomingMessage)
}
