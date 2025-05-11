package webcontroller

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
)

func HealthCheckDetailed(c *gin.Context) {
	// webserver must obviously be running if we got this request
	result := rabbitmq.HealthCheck(true)
	jsonBytes, err := json.MarshalIndent(result, "", "    ")
	if err != nil {
		logging.LogError(err, "Failed to marshal result from health check")
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.String(http.StatusOK, "%s", jsonBytes)
	return

}

func HealthCheckSimple(c *gin.Context) {
	// webserver must obviously be running if we got this request
	result := rabbitmq.HealthCheck(false)
	if result.RabbitmqSuccess && result.DatabaseSuccess && result.GRPCSuccess {
		c.Status(http.StatusOK)
	} else {
		c.AbortWithStatus(http.StatusBadRequest)
	}
	return

}
