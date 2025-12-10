package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"slices"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

// CUSTOM_BROWSER_SYNC STRUCTS
type CustomBrowserSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type CustomBrowserSyncMessage struct {
	CustomBrowser    CustomBrowser `json:"custombrowser"`
	ContainerVersion string        `json:"container_version"`
}

type CustomBrowserTableColumn struct {
	Key                string `json:"key"`
	Name               string `json:"name"`
	FillWidth          bool   `json:"fillWidth"`
	Width              int64  `json:"width"`
	DisableSort        bool   `json:"disableSort"`
	DisableDoubleClick bool   `json:"disableDoubleClick"`
	DisableFilterMenu  bool   `json:"disableFilterMenu"`
	Type               string `json:"type"`
}
type CustomBrowserRowAction struct {
	Name            string `json:"name"`
	UIFeature       string `json:"ui_feature"`
	Icon            string `json:"icon"`
	Color           string `json:"color"`
	SupportsFile    bool   `json:"supports_file"`
	SupportsFolder  bool   `json:"supports_folder"`
	OpenDialog      bool   `json:"openDialog"`
	GetConfirmation bool   `json:"getConfirmation"`
}
type CustomBrowserExtraTableTaskingInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	DisplayName string `json:"display_name"`
	Required    bool   `json:"required"`
}
type CustomBrowser struct {
	Name                   string                                `json:"name"`
	Type                   string                                `json:"type"`
	Separator              string                                `json:"separator"`
	ExportFunction         string                                `json:"export_function"`
	IndicatePartialListing bool                                  `json:"indicate_partial_listing"`
	ShowCurrentPath        bool                                  `json:"show_current_path"`
	Description            string                                `json:"description"`
	Author                 string                                `json:"author"`
	SemVer                 string                                `json:"semver"`
	DefaultVisibleColumns  []string                              `json:"default_visible_columns"`
	Columns                []CustomBrowserTableColumn            `json:"columns"`
	RowActions             []CustomBrowserRowAction              `json:"row_actions"`
	ExtraTableInputs       []CustomBrowserExtraTableTaskingInput `json:"extra_table_inputs"`
}

var validCustomBrowserTypes = []string{"file"}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      CUSTOMBROWSER_SYNC_ROUTING_KEY,
		RoutingKey: CUSTOMBROWSER_SYNC_ROUTING_KEY,
		Handler:    processCustomBrowserSyncMessages,
	})
}

func processCustomBrowserSyncMessages(msg amqp.Delivery) interface{} {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	custombrowserSyncMsg := CustomBrowserSyncMessage{}

	err := json.Unmarshal(msg.Body, &custombrowserSyncMsg)
	if err != nil {
		logging.LogError(err, "Failed to process custom browser sync message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync custom browser profile %s", err.Error()), 0, "", database.MESSAGE_LEVEL_INFO, true)
		return CustomBrowserSyncMessageResponse{Success: false, Error: err.Error()}
	}
	response := CustomBrowserSyncMessageResponse{}
	err = customBrowserSync(custombrowserSyncMsg)
	if err != nil {
		// failed to sync message
		response.Success = false
		response.Error = fmt.Sprintf("Error: %v", err)
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync %s - %s", custombrowserSyncMsg.CustomBrowser.Name, err.Error()), 0, custombrowserSyncMsg.CustomBrowser.Name, database.MESSAGE_LEVEL_INFO, true)
	}
	// successfully synced
	response.Success = true
	logging.LogDebug("Finished processing custom browser sync message")
	return response

}

func customBrowserSync(in CustomBrowserSyncMessage) error {
	//logging.LogDebug("Received connection to c2Sync", "syncMessage", in)
	customSyncBrowser := databaseStructs.CustomBrowser{}
	if in.CustomBrowser.Name == "" {
		logging.LogError(nil, "Can't have custom browser container with empty name - bad sync")
		return errors.New("Can't have custom browser container with empty name - bad sync")
	}
	if !isValidContainerVersion(in.ContainerVersion) {
		logging.LogError(nil, "attempting to sync bad custom browser container version")
		return errors.New(fmt.Sprintf("Version, %s, isn't supported. The max supported version is < %s. \nThis likely means your PyPi or Golang library is out of date and should be updated.", in.ContainerVersion, validContainerVersionMax))
	}
	err := database.DB.Get(&customSyncBrowser, `SELECT * FROM custombrowser WHERE "name"=$1`, in.CustomBrowser.Name)
	if errors.Is(sql.ErrNoRows, err) {
		// this means we don't have the c2 profile, so we need to create it and all the associated components
		logging.LogDebug("Failed to find custom browser, syncing new data", "c2_profile", in.CustomBrowser)
		customSyncBrowser.Name = in.CustomBrowser.Name
		customSyncBrowser.Author = in.CustomBrowser.Author
		customSyncBrowser.ContainerRunning = true
		customSyncBrowser.Description = in.CustomBrowser.Description
		customSyncBrowser.Deleted = false
		customSyncBrowser.SemVer = in.CustomBrowser.SemVer
		customSyncBrowser.Type = in.CustomBrowser.Type
		customSyncBrowser.Separator = in.CustomBrowser.Separator
		if !slices.Contains(validCustomBrowserTypes, in.CustomBrowser.Type) {
			logging.LogError(nil, "Bad type in custom browser", "type", in.CustomBrowser.Type)
			return errors.New("Bad \"type\" in custom browser")
		}
		customSyncBrowser.Columns = GetMythicJSONArrayFromStruct(in.CustomBrowser.Columns)
		customSyncBrowser.DefaultVisibleColumns = GetMythicJSONArrayFromStruct(in.CustomBrowser.DefaultVisibleColumns)
		customSyncBrowser.ExportFunction = in.CustomBrowser.ExportFunction
		customSyncBrowser.ExtraTableInputs = GetMythicJSONArrayFromStruct(in.CustomBrowser.ExtraTableInputs)
		customSyncBrowser.IndicatePartialListing = in.CustomBrowser.IndicatePartialListing
		customSyncBrowser.ShowCurrentPath = in.CustomBrowser.ShowCurrentPath
		customSyncBrowser.RowActions = GetMythicJSONArrayFromStruct(in.CustomBrowser.RowActions)
		statement, err := database.DB.PrepareNamed(`INSERT INTO custombrowser 
			("name",author,container_running,description, deleted, semver, "type", "columns", default_visible_columns,
			 export_function, extra_table_inputs, indicate_partial_listing, show_current_path, row_actions, separator) 
			VALUES (:name, :author, :container_running, :description, :deleted, :semver, :type, :columns, :default_visible_columns,
			        :export_function, :extra_table_inputs, :indicate_partial_listing, :show_current_path, :row_actions, :separator) 
			RETURNING id`,
		)
		if err != nil {
			logging.LogError(err, "Failed to create new custom browser statement")
			return err
		}
		err = statement.Get(&customSyncBrowser.ID, customSyncBrowser)
		if err != nil {
			logging.LogError(err, "Failed to create new custom browser")
			return err
		}
		logging.LogDebug("New custom browser", "custom browser", customSyncBrowser)
	} else if err == nil {
		// the payload exists in the database, so we need to go down the track of updating/adding/removing information
		logging.LogDebug("Found custom browser", "custom browser", customSyncBrowser)
		customSyncBrowser.Author = in.CustomBrowser.Author
		customSyncBrowser.ContainerRunning = true
		customSyncBrowser.Description = in.CustomBrowser.Description
		customSyncBrowser.Deleted = false
		customSyncBrowser.SemVer = in.CustomBrowser.SemVer
		customSyncBrowser.Type = in.CustomBrowser.Type
		customSyncBrowser.Separator = in.CustomBrowser.Separator
		if !slices.Contains(validCustomBrowserTypes, in.CustomBrowser.Type) {
			logging.LogError(nil, "Bad type in custom browser", "type", in.CustomBrowser.Type)
			return errors.New("Bad \"type\" in custom browser")
		}
		customSyncBrowser.Columns = GetMythicJSONArrayFromStruct(in.CustomBrowser.Columns)
		customSyncBrowser.DefaultVisibleColumns = GetMythicJSONArrayFromStruct(in.CustomBrowser.DefaultVisibleColumns)
		customSyncBrowser.ExportFunction = in.CustomBrowser.ExportFunction
		customSyncBrowser.ExtraTableInputs = GetMythicJSONArrayFromStruct(in.CustomBrowser.ExtraTableInputs)
		customSyncBrowser.IndicatePartialListing = in.CustomBrowser.IndicatePartialListing
		customSyncBrowser.ShowCurrentPath = in.CustomBrowser.ShowCurrentPath
		customSyncBrowser.RowActions = GetMythicJSONArrayFromStruct(in.CustomBrowser.RowActions)
		_, err = database.DB.NamedExec(`UPDATE custombrowser SET 
			author=:author, container_running=:container_running, description=:description,deleted=:deleted, semver=:semver,
			"type"=:type, columns=:columns, default_visible_columns=:default_visible_columns, export_function=:export_function,
			extra_table_inputs=:extra_table_inputs, indicate_partial_listing=:indicate_partial_listing,
			show_current_path=:show_current_path, row_actions=:row_actions, separator=:separator
			WHERE id=:id`, customSyncBrowser,
		)
		if err != nil {
			logging.LogError(err, "Failed to update c2 profile in database")
			return err
		}
	} else {
		logging.LogError(err, "failed to search for custom browsers")
		return err
	}
	go SendAllOperationsMessage(fmt.Sprintf("Successfully synced %s with container version %s", customSyncBrowser.Name, in.ContainerVersion), 0, "debug", database.MESSAGE_LEVEL_DEBUG, false)
	go database.ResolveAllOperationsMessage(getDownContainerMessage(customSyncBrowser.Name), 0)

	checkContainerStatusAddCustomBrowserChannel <- customSyncBrowser
	go CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(customSyncBrowser.Name)
	go updateCustomBrowserCache()
	return nil
}
