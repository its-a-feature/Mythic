package webserver

import (
	"fmt"
	"net/http"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"

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
	err := r.SetTrustedProxies([]string{"127.0.0.1"})
	if err != nil {
		logging.LogError(err, "Failed to set trusted proxies")
	}
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
			if tokenStruct, ok := c.Get(authentication.ContextKeyAPIToken); ok {
				if param.Path == "/graphql/webhook" {
					if graphQLOperationName == "" {
						graphQLOperationName = " with a subscription"
					} else {
						graphQLOperationName = "for " + graphQLOperationName
					}
					token := tokenStruct.(databaseStructs.Apitokens)
					go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("APIToken, %s, for user %s (%s) just used %s",
						token.Name, token.Operator.Username, token.Operator.AccountType, graphQLOperationName),
						int(token.Operator.CurrentOperationID.Int64), database.MESSAGE_LEVEL_API,
						database.MESSAGE_LEVEL_API, false)
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
				"user_id", c.GetInt(authentication.ContextKeyUserID),
				"username", c.GetString(authentication.ContextKeyUsername),
				"file_id", c.GetString("file_id"),
				"graphql_name", c.GetString("GraphQLName"),
				"error", param.ErrorMessage)
		}
		c.Next()
	}
}

func setRoutes(r *gin.Engine) {
	// the agent message route is allowed to come from anywhere since it'll come through random c2
	r.POST("/agent_message", webcontroller.AgentMessageWebhook)
	r.GET("/agent_message", webcontroller.AgentMessageGetWebhook)
	// healthcheck endpoint
	r.Use(authentication.IPBlockMiddleware())
	{
		r.GET("/health", webcontroller.HealthCheckSimple)
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
		r.GET("/auth_acs/:containerName/:IDPName", webcontroller.ProcessIDPResponse)
		r.POST("/auth_acs/:containerName/:IDPName", webcontroller.ProcessIDPResponse)

		// create a protected group that requires valid auth with a JWT to access
		protected := r.Group("/")
		protected.Use(authentication.JwtAuthMiddleware())
		{
			// EVERYBODY that can authenticate can do the following
			r.GET("/healthDetailed", webcontroller.HealthCheckDetailed)
			// hasura's graphql endpoint to get updated claims for access control
			//protected.GET("/graphql/webhook", webcontroller.GetHasuraClaims)
			protected.POST("/graphql/webhook", webcontroller.GetHasuraClaims)
			// user
			protected.POST("/me_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_READ,
				}),
				webcontroller.GetMeWebhook) // controller.login
			protected.POST("/generate_apitoken_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_APITOKEN_WRITE,
				}),
				webcontroller.GenerateAPITokenWebhook)
			protected.POST("/delete_apitoken_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_APITOKEN_WRITE,
				}),
				webcontroller.DeleteAPITokenWebhook)
			protected.POST("/apitoken_scope_definitions_webhook",
				webcontroller.APITokenScopeDefinitionsWebhook)
			protected.POST("/scope_check_webhook",
				webcontroller.ScopeCheckWebhook)
			protected.POST("/update_current_operation_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_WRITE,
				}),
				webcontroller.UpdateCurrentOperationWebhook)
			protected.POST("/update_operator_password_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_WRITE,
				}),
				webcontroller.UpdateOperatorPasswordWebhook)
			protected.POST("/create_operator",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_WRITE,
				}),
				webcontroller.CreateOperatorWebhook)
			protected.POST("/operator_get_secrets_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_READ,
				}),
				webcontroller.GetSecretsWebhook)
			protected.POST("/operator_update_secrets_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_WRITE,
				}),
				webcontroller.UpdateSecretsWebhook)
			protected.POST("/operator_get_preferences_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_READ,
				}),
				webcontroller.GetPreferencesWebhook)
			protected.POST("/operator_update_preferences_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATOR_WRITE,
				}),
				webcontroller.UpdatePreferencesWebhook)
			// operation
			protected.POST("/create_operation_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_OPERATION_WRITE,
				}),
				webcontroller.CreateOperationWebhook)
			// global config
			protected.POST("/get_global_settings_webhook",
				authentication.TokenScopeMiddleware([]string{
					mythicjwt.SCOPE_MYTHIC_READ,
				}),
				webcontroller.GetGlobalSettingWebhook)
			// a refresh post will contain the access_token and refresh_token
			protected.POST("/refresh",
				webcontroller.RefreshJWT)
			protected.Static("/static", "./static")
			// following require you to have an operation set
			allOperationMembers := protected.Group("/")
			allOperationMembers.Use(authentication.RBACMiddlewareAll())
			{
				// generic all installed services
				protected.GET("/direct/view/:file_uuid",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_READ,
					}),
					webcontroller.FileDirectViewWebhook)
				// authenticated direct file routes.
				r.GET("/direct/download/:file_uuid",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_READ,
					}),
					webcontroller.FileDirectDownloadWebhook)
				r.POST("/direct/upload/:file_uuid",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_WRITE,
					}),
					webcontroller.FileDirectUploadWebhook)
				allOperationMembers.POST("eventing_import_automatic_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingImportAutomaticWebhook)
				// payloadtype / c2profile
				allOperationMembers.POST("c2profile_status_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_C2_READ,
					}),
					webcontroller.C2ProfileStatusWebhook)
				// payload
				allOperationMembers.POST("config_check_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_READ,
					}),
					webcontroller.C2ProfileConfigCheckWebhook)
				allOperationMembers.POST("export_payload_config_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_READ,
					}),
					webcontroller.ExportPayloadConfigWebhook)
				allOperationMembers.POST("export_callback_config_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_READ,
					}),
					webcontroller.ExportCallbackConfigWebhook)
				allOperationMembers.POST("redirect_rules_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_READ,
					}),
					webcontroller.C2ProfileRedirectRulesWebhook)
				allOperationMembers.POST("get_ioc_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_READ,
					}),
					webcontroller.C2ProfileGetIOCWebhook)
				allOperationMembers.POST("sample_message_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_READ,
					}),
					webcontroller.C2ProfileSampleMessageWebhook)
				// file
				allOperationMembers.POST("download_bulk_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_READ,
					}),
					webcontroller.DownloadBulkFilesWebhook)
				allOperationMembers.POST("preview_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_READ,
					}),
					webcontroller.PreviewFileWebhook)
				allOperationMembers.GET("screencaptures/:file_uuid",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_READ,
					}),
					webcontroller.DownloadFileAuthWebhook)
			}
			noSpectators := protected.Group("/")
			noSpectators.Use(authentication.RBACMiddlewareNoSpectators())
			{
				// everybody EXCEPT SPECTATORS can do these actions
				// generic for all installed services
				noSpectators.POST("container_write_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CONTAINER_FILE_WRITE,
					}),
					webcontroller.ContainerWriteFileWebhook)
				noSpectators.POST("container_remove_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CONTAINER_FILE_WRITE,
					}),
					webcontroller.ContainerRemoveFileWebhook)
				noSpectators.POST("container_download_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CONTAINER_FILE_READ,
					}),
					webcontroller.ContainerDownloadFileWebhook)
				noSpectators.POST("container_list_files_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CONTAINER_FILE_READ,
					}),
					webcontroller.ContainerListFilesWebhook)
				// external consuming services actions
				noSpectators.POST("consuming_services_test_webhook",
					webcontroller.ConsumingServicesTestWebhook)
				noSpectators.POST("consuming_services_test_log",
					webcontroller.ConsumingServicesTestLog)
				// creating a payload
				noSpectators.POST("createpayload_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_WRITE,
					}),
					webcontroller.CreatePayloadWebhook)
				// tasking
				noSpectators.POST("task_upload_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_WRITE,
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.TaskUploadFileWebhook)
				noSpectators.POST("create_task_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.CreateTaskWebhook)
				noSpectators.POST("dynamic_query_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.PayloadTypeDynamicQueryFunctionWebhook)
				noSpectators.POST("dynamic_query_build_parameter_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_WRITE,
					}),
					webcontroller.PayloadTypeDynamicQueryBuildParameterFunctionWebhook)
				noSpectators.POST("typedarray_parse_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.PayloadTypeDynamicTypedArrayParseWebhook)
				noSpectators.POST("add_attack_to_task_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.AddAttackToTaskWebhook)
				noSpectators.POST("reissue_task_webhook", blank)
				noSpectators.POST("reissue_task_handler_webhook", blank)
				noSpectators.POST("request_opsec_bypass_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.RequestOpsecBypassWebhook)
				// payloadtype / c2profile
				noSpectators.POST("create_c2parameter_instance_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.CreateC2ParameterInstanceWebhook)
				noSpectators.POST("import_c2parameter_instance_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.ImportC2ParameterInstanceWebhook)
				noSpectators.POST("start_stop_profile_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_C2_WRITE,
					}),
					webcontroller.StartStopC2ProfileWebhook)
				noSpectators.POST("c2profile_host_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_C2_WRITE,
					}),
					webcontroller.C2HostFileMessageWebhook)
				// payload
				noSpectators.POST("rebuild_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_WRITE,
					}),
					webcontroller.PayloadRebuildWebhook)
				noSpectators.POST("update_payload_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_PAYLOAD_WRITE,
					}),
					webcontroller.UpdatePayloadWebhook)
				// operation
				noSpectators.POST("update_operation_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATION_WRITE,
					}),
					webcontroller.UpdateOperationWebhook)
				noSpectators.POST("update_operatoroperation_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATION_WRITE,
					}),
					webcontroller.UpdateOperatorOperationWebhook)
				// file
				noSpectators.POST("delete_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_FILE_WRITE,
					}),
					webcontroller.DeleteFileWebhook)
				// callback
				noSpectators.POST("toggle_proxy_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.ProxyToggleWebhook)
				noSpectators.POST("test_proxy_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.ProxyTestWebhook)
				noSpectators.POST("update_callback_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.UpdateCallbackWebhook)
				noSpectators.POST("callback_import_config_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.ImportCallbackConfigWebhook)
				// reporting
				noSpectators.POST("reporting_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_READ,
						mythicjwt.SCOPE_TASK_READ,
						mythicjwt.SCOPE_OPERATION_READ,
					}),
					webcontroller.ReportingWebhook)
				// tagtypes
				noSpectators.POST("tagtype_delete_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TAG_WRITE,
					}),
					webcontroller.TagtypeDeleteWebhook)
				noSpectators.POST("tagtype_import_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TAG_WRITE,
					}),
					webcontroller.TagtypeImportWebhook)
				noSpectators.POST("tagtype_create_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TAG_WRITE,
					}),
					webcontroller.TagTypeCreateWebhook)
				noSpectators.POST("tag_create_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_TAG_WRITE,
					}),
					webcontroller.TagCreateWebhook)
				// callbackgraph edges
				noSpectators.POST("callbackgraphedge_add_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.CallbackgraphedgeAddWebhook)
				noSpectators.POST("callbackgraphedge_remove_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.CallbackgraphedgeRemoveWebhook)
				// callback
				noSpectators.POST("create_callback_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
					}),
					webcontroller.CreateCallbackWebhook)
				noSpectators.POST("delete_tasks_and_callbacks_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CALLBACK_WRITE,
						mythicjwt.SCOPE_TASK_WRITE,
					}),
					webcontroller.DeleteTasksAndCallbacks)
				// credentials
				noSpectators.POST("create_credential_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_CREDENTIAL_WRITE,
					}),
					webcontroller.CreateCredentialWebhook)
				// user output response
				noSpectators.POST("response_user_output_create_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_RESPONSE_WRITE,
					}),
					webcontroller.ResponseUserOutputCreateWebhook)
				noSpectators.POST("artifact_create_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_RESPONSE_WRITE,
					}),
					webcontroller.ArtifactCreateWebhook)
				// tree data (file browser / process browser)
				noSpectators.POST("mythictree_create_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_RESPONSE_WRITE,
					}),
					webcontroller.MythictreeCreateWebhook)
				// submitting webhooks
				noSpectators.POST("send_external_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_WEBHOOK_WRITE,
					}),
					webcontroller.SendExternalWebhookWebhook)
				noSpectators.POST("create_operation_event_log",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTLOG_WRITE,
					}),
					webcontroller.CreateOperationEventLog)
				// eventing webhooks
				noSpectators.POST("eventing_import_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
						mythicjwt.SCOPE_FILE_WRITE,
					}),
					webcontroller.EventingImportWebhook)
				noSpectators.POST("eventing_trigger_manual_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerManualWebhook)
				noSpectators.POST("eventing_trigger_keyword_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerKeywordWebhook)
				noSpectators.POST("eventing_update_eventgroupapproval_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.UpdateEventGroupApprovalWebhook)
				noSpectators.POST("eventing_trigger_cancel_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerCancelWebhook)
				noSpectators.POST("eventing_register_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
						mythicjwt.SCOPE_FILE_WRITE,
					}),
					webcontroller.EventGroupRegisterFileWebhook)
				noSpectators.POST("eventing_trigger_retry_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerRetryWebhook)
				noSpectators.POST("eventing_trigger_retry_from_step_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerRetryFromStepWebhook)
				noSpectators.POST("eventing_trigger_runagain_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerRunAgainWebhook)
				noSpectators.POST("eventing_trigger_update_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerUpdateWebhook)
				noSpectators.POST("eventing_test_file_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_READ,
					}),
					webcontroller.EventingTestFileWebhook)
				noSpectators.POST("eventing_export_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_READ,
					}),
					webcontroller.EventingExportWebhook)
				noSpectators.POST("eventing_trigger_manual_bulk_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_EVENTING_WRITE,
					}),
					webcontroller.EventingTriggerManualBulkWebhook)
				// keylogs
				noSpectators.POST("keylog_create_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_RESPONSE_WRITE,
					}),
					webcontroller.CreateKeylogWebhook)
				// custom browsers
				noSpectators.POST("custombrowser_export_function_webhook",
					webcontroller.CustomBrowserExportFunctionWebhook)
			}
			operationAdminsOnly := protected.Group("/")
			operationAdminsOnly.Use(authentication.RBACMiddlewareOperationAdmin())
			{
				// Only OPERATION_ADMIN
				operationAdminsOnly.POST("delete_disabled_command_profile_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATION_WRITE,
					}),
					webcontroller.DeleteDisabledCommandProfileWebhook)
				operationAdminsOnly.POST("delete_disabled_command_profile_entry_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATION_WRITE,
					}),
					webcontroller.DeleteDisabledCommandProfileEntryWebhook)
			}
			adminsOnly := protected.Group("/")
			adminsOnly.Use(authentication.RBACMiddlewareAdmin())
			{
				// global settings, only admin
				operationAdminsOnly.POST("update_global_settings_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_MYTHIC_WRITE,
					}),
					webcontroller.UpdateGlobalSettingsWebhook)
				// generating invite links, further limited to just admins
				operationAdminsOnly.POST("create_invite_link_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATION_WRITE,
						mythicjwt.SCOPE_MYTHIC_WRITE,
					}),
					webcontroller.CreateInviteLink)
				operationAdminsOnly.POST("get_invite_link_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_MYTHIC_READ,
					}),
					webcontroller.GetOutstandingInviteLinks)
				operationAdminsOnly.POST("update_invite_link_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATION_WRITE,
						mythicjwt.SCOPE_MYTHIC_WRITE,
					}),
					webcontroller.UpdateInviteLink)
				operationAdminsOnly.POST("update_operator_status_webhook",
					authentication.TokenScopeMiddleware([]string{
						mythicjwt.SCOPE_OPERATOR_WRITE,
					}),
					webcontroller.UpdateOperatorStatusWebhook)
			}
		}
	}
}

func blank(c *gin.Context) {
	logging.LogError(nil, "Hit a blank function")
	c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Function not implemented"})
}
