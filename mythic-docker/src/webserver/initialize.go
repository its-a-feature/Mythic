package webserver

import (
	"fmt"
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

	logging.LogInfo("Starting webserver", "host", "0.0.0.0", "port", utils.MythicConfig.ServerPort)
	if err := r.Run(fmt.Sprintf("%s:%d", "0.0.0.0", utils.MythicConfig.ServerPort)); err != nil {
		logging.LogError(err, "Failed to start webserver")
	}

	logging.LogFatalError(nil, "Webserver stopped")
}

func InitializeGinLogger() gin.HandlerFunc {
	ignorePaths := []string{"/graphql/webhook", "/agent_message", "/health"}
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
			logging.LogDebug("WebServer Logging",
				"ClientIP", param.ClientIP,
				"method", param.Method,
				"path", param.Path,
				"protocol", param.Request.Proto,
				"statusCode", param.StatusCode,
				"latency", param.Latency,
				"responseSize", param.BodySize,
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
		// unauthenticated file download based on file UUID
		// this is for payload hosting and payload containers to fetch files via web
		r.GET("/direct/download/:file_uuid", webcontroller.FileDirectDownloadWebhook)
		// unauthenticated file upload based on file UUID
		// this is for payload containers to upload files that are too big for rabbitmq
		r.POST("/direct/upload/:file_uuid", webcontroller.FileDirectUploadWebhook)
		// a refresh post will contain the access_token and refresh_token
		r.POST("/refresh", webcontroller.RefreshJWT)
		// create a protected group that allows Cookie values to access things instead of only a JWT header field
		// this mainly allows the user through the UI to view agent icons and download files
		allowAuthenticatedCookies := r.Group("/")
		{
			// allow access to getting images for agent icons, still blocked by IP range
			allowAuthenticatedCookies.Use(authentication.CookieAuthMiddleware())
			{
				r.Static("/static", "./static")
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
			protected.GET("/graphql/webhook", webcontroller.GetHasuraClaims)
			// user
			protected.GET("/me", webcontroller.GetMe)                          // controller.login
			protected.POST("/api/v1.4/me_webhook", webcontroller.GetMeWebhook) // controller.login
			protected.POST("/api/v1.4/generate_apitoken_webhook", webcontroller.GenerateAPITokenWebhook)
			protected.POST("/api/v1.4/update_current_operation_webhook", webcontroller.UpdateCurrentOperationWebhook)
			protected.POST("/api/v1.4/update_operator_password_webhook", webcontroller.UpdateOperatorPasswordWebhook)
			// following require you to have an operation set
			allOperationMembers := protected.Group("/api/v1.4/")
			allOperationMembers.Use(authentication.RBACMiddlewareAll())
			{

				// payloadtype / c2profile
				allOperationMembers.POST("c2profile_download_file_webhook", webcontroller.C2ProfileGetFileWebhook)
				allOperationMembers.POST("c2profile_status_webhook", webcontroller.C2ProfileStatusWebhook)
				allOperationMembers.POST("c2profile_list_files_webhook", webcontroller.C2ProfileListFilesWebhook)
				// payload
				allOperationMembers.POST("config_check_webhook", webcontroller.C2ProfileConfigCheckWebhook)
				allOperationMembers.POST("export_payload_config_webhook", webcontroller.ExportPayloadConfigWebhook)
				allOperationMembers.POST("redirect_rules_webhook", webcontroller.C2ProfileRedirectRulesWebhook)
				// file
				allOperationMembers.POST("download_bulk_webhook", webcontroller.DownloadBulkFilesWebhook)
				allOperationMembers.POST("preview_file_webhook", webcontroller.PreviewFileWebhook)
				// submitting webhooks
				allOperationMembers.POST("send_external_webhook", webcontroller.SendExternalWebhookWebhook)
			}

			noSpectators := protected.Group("/api/v1.4/")
			noSpectators.Use(authentication.RBACMiddlewareNoSpectators())
			{
				// everybody EXCEPT SPECTATORS can do these actions
				// external consuming services actions
				noSpectators.POST("consuming_services_test_webhook", webcontroller.ConsumingServicesTestWebhook)
				noSpectators.POST("consuming_services_test_log", webcontroller.ConsumingServicesTestLog)
				// creating a payload
				noSpectators.POST("createpayload_webhook", webcontroller.CreatePayloadWebhook)

				// tasking
				noSpectators.POST("task_upload_file_webhook", webcontroller.TaskUploadFileWebhook)
				noSpectators.POST("create_task_webhook", webcontroller.CreateTaskWebhook)
				noSpectators.POST("dynamic_query_webhook", webcontroller.PayloadTypeDynamicQueryFunctionWebhook)
				noSpectators.POST("reissue_task_webhook", blank)
				noSpectators.POST("reissue_task_handler_webhook", blank)
				noSpectators.POST("request_opsec_bypass_webhook", webcontroller.RequestOpsecBypassWebhook)
				// payloadtype / c2profile
				noSpectators.POST("create_c2parameter_instance_webhook", webcontroller.CreateC2ParameterInstanceWebhook)
				noSpectators.POST("c2profile_upload_file_webhook", webcontroller.C2ProfileWriteFileWebhook)
				noSpectators.POST("c2profile_remove_file_webhook", webcontroller.C2ProfileRemoveFileWebhook)
				noSpectators.POST("start_stop_profile_webhook", webcontroller.StartStopC2ProfileWebhook)
				// payload
				noSpectators.POST("rebuild_webhook", webcontroller.PayloadRebuildWebhook)
				// user
				noSpectators.POST("create_operator", webcontroller.CreateOperatorWebhook)
				// operation
				noSpectators.POST("create_operation_webhook", webcontroller.CreateOperationWebhook)
				// file
				noSpectators.POST("delete_file_webhook", webcontroller.DeleteFileWebhook)
				// callback
				noSpectators.POST("stop_proxy_webhook", webcontroller.ProxyStopWebhook)
				noSpectators.POST("update_callback_webhook", webcontroller.UpdateCallbackWebhook)
				// reporting
				noSpectators.POST("reporting_webhook", webcontroller.ReportingWebhook)
				// tagtypes
				noSpectators.POST("tagtype_delete_webhook", webcontroller.TagtypeDeleteWebhook)
				noSpectators.POST("tagtype_import_webhook", webcontroller.TagtypeImportWebhook)
				// callbackgraph edges
				noSpectators.POST("callbackgraphedge_add_webhook", webcontroller.CallbackgraphedgeAddWebhook)
				noSpectators.POST("callbackgraphedge_remove_webhook", webcontroller.CallbackgraphedgeRemoveWebhook)
				// callback
				noSpectators.POST("create_callback_webhook", webcontroller.CreateCallbackWebhook)
				noSpectators.POST("delete_tasks_and_callbacks_webhook", webcontroller.DeleteTasksAndCallbacks)
			}
			operationAdminsOnly := protected.Group("/api/v1.4/")
			operationAdminsOnly.Use(authentication.RBACMiddlewareOperationAdmin())
			{
				// Only OPERATION_ADMIN and MYTHIC_ADMIN can do these routes
				// operation
				noSpectators.POST("delete_disabled_command_profile_webhook", webcontroller.DeleteDisabledCommandProfileWebhook)
				noSpectators.POST("delete_disabled_command_profile_entry_webhook", webcontroller.DeleteDisabledCommandProfileEntryWebhook)
			}
		}
	}
}

func blank(c *gin.Context) {
	logging.LogError(nil, "Hit a blank function")
	c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Function not implemented"})
}
