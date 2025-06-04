package webserver

import (
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	webcontroller "github.com/its-a-feature/Mythic/webserver/controllers"
)

func Initialize() *gin.Engine {
	//gin.DisableConsoleColor()
	switch utils.MythicConfig.DebugLevel {
	case "warning":
		gin.SetMode(gin.ReleaseMode)
	case "debug":
		gin.SetMode(gin.ReleaseMode)
	default:
		gin.SetMode(gin.DebugMode)
	}
	r := gin.New()
	// Global middleware
	r.Use(InitializeGinLogger())
	// Recovery middleware recovers from any panics and writes a 500 if there was one.
	r.Use(gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logging.LogError(nil, "http error", "error", recovered)
		if err, ok := recovered.(string); ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error: %s", err)})
		}
		c.AbortWithStatus(http.StatusInternalServerError)
	}))
	r.RedirectFixedPath = true
	r.HandleMethodNotAllowed = true
	r.RemoveExtraSlash = true
	r.MaxMultipartMemory = 8 << 20 // 8 MB
	// set up the routes to use
	setRoutes(r)
	return r
}

func StartServer(r *gin.Engine) {
	if utils.MythicConfig.ServerDockerNetworking == "bridge" {
		// bind to 0.0.0.0 because it's docker-compose.yml that'll expose the port on 0.0.0.0 or 127.0.0.1 as needed
		logging.LogInfo("Starting webserver", "host", "0.0.0.0", "port", utils.MythicConfig.ServerPort)
		if err := r.Run(fmt.Sprintf("%s:%d", "0.0.0.0", utils.MythicConfig.ServerPort)); err != nil {
			logging.LogError(err, "Failed to start webserver")
		}
	} else if utils.MythicConfig.ServerDockerNetworking == "host" {
		// need to bind on 0.0.0.0 or 127.0.0.1 explicitly because we have host networking
		if utils.MythicConfig.ServerBindLocalhostOnly {
			logging.LogInfo("Starting webserver", "host", "127.0.0.1", "port", utils.MythicConfig.ServerPort)
			if err := r.Run(fmt.Sprintf("%s:%d", "127.0.0.1", utils.MythicConfig.ServerPort)); err != nil {
				logging.LogError(err, "Failed to start webserver")
			}
		} else {
			logging.LogInfo("Starting webserver", "host", "0.0.0.0", "port", utils.MythicConfig.ServerPort)
			if err := r.Run(fmt.Sprintf("%s:%d", "0.0.0.0", utils.MythicConfig.ServerPort)); err != nil {
				logging.LogError(err, "Failed to start webserver")
			}
		}
	} else {
		logging.LogError(nil, "unknown networking type", "networking", utils.MythicConfig.ServerDockerNetworking)
	}

	logging.LogFatalError(nil, "Webserver stopped")
}

func InitializeGinLogger() gin.HandlerFunc {
	ignorePaths := []string{"/agent_message", "/health", "/static"}
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		// Process request
		c.Next()
		param := gin.LogFormatterParams{
			Request: c.Request,
			Keys:    c.Keys,
		}

		// Stop timer
		param.TimeStamp = time.Now()

		param.Path = path
		if !utils.SliceContains(ignorePaths, param.Path) {
			//if param.Path != "/graphql/webhook" && !strings.Contains(param.Path, "/agent_message") {
			param.Latency = param.TimeStamp.Sub(start)
			param.ClientIP = c.ClientIP()
			param.Method = c.Request.Method
			param.StatusCode = c.Writer.Status()
			param.ErrorMessage = c.Errors.ByType(gin.ErrorTypePrivate).String()
			param.BodySize = c.Writer.Size()
			if raw != "" {
				path = path + "?" + raw
			}
			source := c.GetHeader("MythicSource")
			if source == "" {
				source = "scripting"
			}
			graphQLOperationName := c.GetString("GraphQLName")
			if tokenStruct, ok := c.Get("apitoken_logging_struct"); ok {
				if param.Path == "/graphql/webhook" {
					if graphQLOperationName == "" {
						graphQLOperationName = " with a subscription"
					} else {
						graphQLOperationName = "for " + graphQLOperationName
					}
					token := tokenStruct.(databaseStructs.Apitokens)
					go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("APIToken, %s, for user %s (%s) just used %s",
						token.Name, token.Operator.Username, token.Operator.AccountType, graphQLOperationName),
						int(token.Operator.CurrentOperationID.Int64), token.TokenValue,
						database.MESSAGE_LEVEL_API)
				}
			}
			logging.LogInfo("WebServer Logging",
				"ClientIP", param.ClientIP,
				"method", param.Method,
				"path", param.Path,
				"protocol", param.Request.Proto,
				"statusCode", param.StatusCode,
				"latency", param.Latency.String(),
				"responseSize", param.BodySize,
				"source", source,
				"user_id", c.GetInt("user_id"),
				"username", c.GetString("username"),
				"file_id", c.GetString("file_id"),
				"graphql_name", c.GetString("GraphQLName"),
				"error", param.ErrorMessage)
		}
		c.Next()
	}
}

func setRoutes(r *gin.Engine) {
	// the agent message route is allowed to come from anywhere since it'll come through random c2
	r.POST("/api/v1.4/agent_message", webcontroller.AgentMessageWebhook)
	r.GET("/api/v1.4/agent_message", webcontroller.AgentMessageGetWebhook)
	r.POST("/agent_message", webcontroller.AgentMessageWebhook)
	r.GET("/agent_message", webcontroller.AgentMessageGetWebhook)
	// healthcheck endpoint
	r.GET("/health", webcontroller.HealthCheckSimple)
	r.GET("/healthDetailed", webcontroller.HealthCheckDetailed)
	r.Use(authentication.IPBlockMiddleware())
	{
		// login page
		r.POST("/auth", webcontroller.Login)
		r.POST("/invite", webcontroller.UseInviteLink)
		// get the list of online services for the ui
		r.GET("/auth_services", webcontroller.GetAvailableAuthContainerIDPs)
		// get the metadata for a specific container and IDP in json for the web ui
		r.GET("/auth_metadata/:containerName/:IDPName", webcontroller.GetAuthContainerMetadata)
		// the /metadata endpoint responds with raw text of the metadata for an IDP to fetch if it can reach Mythic
		r.GET("/auth_metadata/:containerName/:IDPName/metadata", webcontroller.GetAuthContainerMetadataIDPEndpoint)
		r.GET("/auth_redirect/:containerName/:IDPName", webcontroller.GetAuthContainerRedirect)
		r.POST("/auth_acs/:containerName/:IDPName", webcontroller.ProcessIDPResponse)
		// unauthenticated file download based on file UUID
		// this is for payload hosting and payload containers to fetch files via web
		r.GET("/direct/download/:file_uuid", webcontroller.FileDirectDownloadWebhook)
		// unauthenticated file upload based on file UUID
		// this is for payload containers to upload files that are too big for rabbitmq
		r.POST("/direct/upload/:file_uuid", webcontroller.FileDirectUploadWebhook)

		// create a protected group that allows Cookie values to access things instead of only a JWT header field
		// this mainly allows the user through the UI to view agent icons and download files
		allowAuthenticatedCookies := r.Group("/")
		{
			// allow access to getting images for agent icons, still blocked by IP range
			allowAuthenticatedCookies.Use(authentication.CookieAuthMiddleware())
			{
				allowAuthenticatedCookies.Static("/static", "./static")
				allowAuthenticatedCookies.GET("direct/view/:file_uuid", webcontroller.FileDirectViewWebhook)
				allOperationMembersWithCookies := allowAuthenticatedCookies.Group("/api/v1.4/")
				allOperationMembersWithCookies.Use(authentication.RBACMiddlewareAll())
				{
					allOperationMembersWithCookies.GET("files/download/:file_uuid", webcontroller.DownloadFileAuthWebhook)
					allOperationMembersWithCookies.GET("files/screencaptures/:file_uuid", webcontroller.DownloadFileAuthWebhook)
				}
			}
		}
		// create a protected group that requires valid auth with a JWT to access
		protected := r.Group("/")
		protected.Use(authentication.JwtAuthMiddleware())
		{
			// EVERYBODY that can authenticate can do the following
			// hasura's graphql endpoint to get updated claims for access control
			//protected.GET("/graphql/webhook", webcontroller.GetHasuraClaims)
			protected.POST("/graphql/webhook", webcontroller.GetHasuraClaims)
			// user
			protected.GET("/me", webcontroller.GetMe)                          // controller.login
			protected.POST("/api/v1.4/me_webhook", webcontroller.GetMeWebhook) // controller.login
			protected.POST("/api/v1.4/generate_apitoken_webhook", webcontroller.GenerateAPITokenWebhook)
			protected.POST("/api/v1.4/delete_apitoken_webhook", webcontroller.DeleteAPITokenWebhook)
			protected.POST("/api/v1.4/update_current_operation_webhook", webcontroller.UpdateCurrentOperationWebhook)
			protected.POST("/api/v1.4/update_operator_password_webhook", webcontroller.UpdateOperatorPasswordWebhook)
			protected.POST("/api/v1.4/create_operator", webcontroller.CreateOperatorWebhook)
			protected.POST("/api/v1.4/operator_get_secrets_webhook", webcontroller.GetSecretsWebhook)
			protected.POST("/api/v1.4/operator_update_secrets_webhook", webcontroller.UpdateSecretsWebhook)
			protected.POST("/api/v1.4/operator_get_preferences_webhook", webcontroller.GetPreferencesWebhook)
			protected.POST("/api/v1.4/operator_update_preferences_webhook", webcontroller.UpdatePreferencesWebhook)
			// operation
			protected.POST("/api/v1.4/create_operation_webhook", webcontroller.CreateOperationWebhook)
			// global config
			protected.POST("/api/v1.4/get_global_settings_webhook", webcontroller.GetGlobalSettingWebhook)
			// a refresh post will contain the access_token and refresh_token
			protected.POST("/refresh", webcontroller.RefreshJWT)
			// following require you to have an operation set
			allOperationMembers := protected.Group("/api/v1.4/")
			allOperationMembers.Use(authentication.RBACMiddlewareAll())
			{
				// generic all installed services
				allOperationMembers.POST("eventing_import_automatic_webhook", webcontroller.EventingImportAutomaticWebhook)
				// payloadtype / c2profile
				allOperationMembers.POST("c2profile_status_webhook", webcontroller.C2ProfileStatusWebhook)
				// payload
				allOperationMembers.POST("config_check_webhook", webcontroller.C2ProfileConfigCheckWebhook)
				allOperationMembers.POST("export_payload_config_webhook", webcontroller.ExportPayloadConfigWebhook)
				allOperationMembers.POST("export_callback_config_webhook", webcontroller.ExportCallbackConfigWebhook)
				allOperationMembers.POST("redirect_rules_webhook", webcontroller.C2ProfileRedirectRulesWebhook)
				allOperationMembers.POST("get_ioc_webhook", webcontroller.C2ProfileGetIOCWebhook)
				allOperationMembers.POST("sample_message_webhook", webcontroller.C2ProfileSampleMessageWebhook)
				// file
				allOperationMembers.POST("download_bulk_webhook", webcontroller.DownloadBulkFilesWebhook)
				allOperationMembers.POST("preview_file_webhook", webcontroller.PreviewFileWebhook)
			}
			noSpectators := protected.Group("/api/v1.4/")
			noSpectators.Use(authentication.RBACMiddlewareNoSpectators())
			{
				// everybody EXCEPT SPECTATORS can do these actions
				// generic for all installed services
				noSpectators.POST("container_write_file_webhook", webcontroller.ContainerWriteFileWebhook)
				noSpectators.POST("container_remove_file_webhook", webcontroller.ContainerRemoveFileWebhook)
				noSpectators.POST("container_download_file_webhook", webcontroller.ContainerDownloadFileWebhook)
				noSpectators.POST("container_list_files_webhook", webcontroller.ContainerListFilesWebhook)
				// external consuming services actions
				noSpectators.POST("consuming_services_test_webhook", webcontroller.ConsumingServicesTestWebhook)
				noSpectators.POST("consuming_services_test_log", webcontroller.ConsumingServicesTestLog)
				// creating a payload
				noSpectators.POST("createpayload_webhook", webcontroller.CreatePayloadWebhook)
				// tasking
				noSpectators.POST("task_upload_file_webhook", webcontroller.TaskUploadFileWebhook)
				noSpectators.POST("create_task_webhook", webcontroller.CreateTaskWebhook)
				noSpectators.POST("dynamic_query_webhook", webcontroller.PayloadTypeDynamicQueryFunctionWebhook)
				noSpectators.POST("typedarray_parse_webhook", webcontroller.PayloadTypeDynamicTypedArrayParseWebhook)
				noSpectators.POST("add_attack_to_task_webhook", webcontroller.AddAttackToTaskWebhook)
				noSpectators.POST("reissue_task_webhook", blank)
				noSpectators.POST("reissue_task_handler_webhook", blank)
				noSpectators.POST("request_opsec_bypass_webhook", webcontroller.RequestOpsecBypassWebhook)
				// payloadtype / c2profile
				noSpectators.POST("create_c2parameter_instance_webhook", webcontroller.CreateC2ParameterInstanceWebhook)
				noSpectators.POST("import_c2parameter_instance_webhook", webcontroller.ImportC2ParameterInstanceWebhook)
				noSpectators.POST("start_stop_profile_webhook", webcontroller.StartStopC2ProfileWebhook)
				noSpectators.POST("c2profile_host_file_webhook", webcontroller.C2HostFileMessageWebhook)
				// payload
				noSpectators.POST("rebuild_webhook", webcontroller.PayloadRebuildWebhook)
				noSpectators.POST("update_payload_webhook", webcontroller.UpdatePayloadWebhook)
				// operation
				noSpectators.POST("update_operation_webhook", webcontroller.UpdateOperationWebhook)
				noSpectators.POST("update_operatoroperation_webhook", webcontroller.UpdateOperatorOperationWebhook)
				// file
				noSpectators.POST("delete_file_webhook", webcontroller.DeleteFileWebhook)
				// callback
				noSpectators.POST("toggle_proxy_webhook", webcontroller.ProxyToggleWebhook)
				noSpectators.POST("test_proxy_webhook", webcontroller.ProxyTestWebhook)
				noSpectators.POST("update_callback_webhook", webcontroller.UpdateCallbackWebhook)
				noSpectators.POST("callback_import_config_webhook", webcontroller.ImportCallbackConfigWebhook)
				// reporting
				noSpectators.POST("reporting_webhook", webcontroller.ReportingWebhook)
				// tagtypes
				noSpectators.POST("tagtype_delete_webhook", webcontroller.TagtypeDeleteWebhook)
				noSpectators.POST("tagtype_import_webhook", webcontroller.TagtypeImportWebhook)
				noSpectators.POST("tagtype_create_webhook", webcontroller.TagTypeCreateWebhook)
				noSpectators.POST("tag_create_webhook", webcontroller.TagCreateWebhook)
				// callbackgraph edges
				noSpectators.POST("callbackgraphedge_add_webhook", webcontroller.CallbackgraphedgeAddWebhook)
				noSpectators.POST("callbackgraphedge_remove_webhook", webcontroller.CallbackgraphedgeRemoveWebhook)
				// callback
				noSpectators.POST("create_callback_webhook", webcontroller.CreateCallbackWebhook)
				noSpectators.POST("delete_tasks_and_callbacks_webhook", webcontroller.DeleteTasksAndCallbacks)
				// credentials
				noSpectators.POST("create_credential_webhook", webcontroller.CreateCredentialWebhook)
				// user output response
				noSpectators.POST("response_user_output_create_webhook", webcontroller.ResponseUserOutputCreateWebhook)
				noSpectators.POST("artifact_create_webhook", webcontroller.ArtifactCreateWebhook)
				// tree data (file browser / process browser)
				noSpectators.POST("mythictree_create_webhook", webcontroller.MythictreeCreateWebhook)
				// submitting webhooks
				noSpectators.POST("send_external_webhook", webcontroller.SendExternalWebhookWebhook)
				noSpectators.POST("create_operation_event_log", webcontroller.CreateOperationEventLog)
				// eventing webhooks
				noSpectators.POST("eventing_import_webhook", webcontroller.EventingImportWebhook)
				noSpectators.POST("eventing_trigger_manual_webhook", webcontroller.EventingTriggerManualWebhook)
				noSpectators.POST("eventing_trigger_keyword_webhook", webcontroller.EventingTriggerKeywordWebhook)
				noSpectators.POST("eventing_update_eventgroupapproval_webhook", webcontroller.UpdateEventGroupApprovalWebhook)
				noSpectators.POST("eventing_trigger_cancel_webhook", webcontroller.EventingTriggerCancelWebhook)
				noSpectators.POST("eventing_register_file_webhook", webcontroller.EventGroupRegisterFileWebhook)
				noSpectators.POST("eventing_trigger_retry_webhook", webcontroller.EventingTriggerRetryWebhook)
				noSpectators.POST("eventing_trigger_retry_from_step_webhook", webcontroller.EventingTriggerRetryFromStepWebhook)
				noSpectators.POST("eventing_trigger_runagain_webhook", webcontroller.EventingTriggerRunAgainWebhook)
				noSpectators.POST("eventing_trigger_update_webhook", webcontroller.EventingTriggerUpdateWebhook)
				noSpectators.POST("eventing_test_file_webhook", webcontroller.EventingTestFileWebhook)
				noSpectators.POST("eventing_export_webhook", webcontroller.EventingExportWebhook)
				// keylogs
				noSpectators.POST("keylog_create_webhook", webcontroller.CreateKeylogWebhook)
			}
			operationAdminsOnly := protected.Group("/api/v1.4/")
			operationAdminsOnly.Use(authentication.RBACMiddlewareOperationAdmin())
			{
				// Only OPERATION_ADMIN and MYTHIC_ADMIN can do these routes
				operationAdminsOnly.POST("update_operator_status_webhook", webcontroller.UpdateOperatorStatusWebhook)
				operationAdminsOnly.POST("delete_disabled_command_profile_webhook", webcontroller.DeleteDisabledCommandProfileWebhook)
				operationAdminsOnly.POST("delete_disabled_command_profile_entry_webhook", webcontroller.DeleteDisabledCommandProfileEntryWebhook)
				// global settings, only admin
				operationAdminsOnly.POST("update_global_settings_webhook", webcontroller.UpdateGlobalSettingsWebhook)
				// generating invite links, further limited to just admins
				operationAdminsOnly.POST("create_invite_link_webhook", webcontroller.CreateInviteLink)
				operationAdminsOnly.POST("get_invite_link_webhook", webcontroller.GetOutstandingInviteLinks)
				operationAdminsOnly.POST("delete_invite_link_webhook", webcontroller.DeleteInviteLink)
				operationAdminsOnly.POST("update_invite_link_webhook", webcontroller.UpdateInviteLink)
			}
		}
	}
}

func blank(c *gin.Context) {
	logging.LogError(nil, "Hit a blank function")
	c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Function not implemented"})
}
