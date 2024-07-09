package authentication

import (
	"fmt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

func JwtAuthMiddleware() gin.HandlerFunc {
	// verify that all authenticated requests have valid signatures and aren't expired
	return func(c *gin.Context) {
		err := TokenValid(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func CookieAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		err := CookieTokenValid(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		c.Request.Header.Add("MythicSource", "cookie")
		c.Next()
	}
}

func IPBlockMiddleware() gin.HandlerFunc {
	// verify that xforward-for address is in range from utils.Config.AllowedIPBlocks
	return func(c *gin.Context) {
		ip := c.ClientIP()
		ipAddr := net.ParseIP(ip)
		if ipAddr == nil {
			logging.LogError(nil, "Failed to parse client IP", "client_ip", ip)
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		// make sure the ipAddr is in at least one of the alowed IP blocks
		for _, subnet := range utils.MythicConfig.AllowedIPBlocks {
			if subnet.Contains(ipAddr) {
				c.Next()
				return
			}
		}

		logging.LogError(nil, "Client IP not in allowed IP blocks", "client_ip", ipAddr)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Client IP, %s, not in allowed IP blocks: %v", ipAddr.String(), utils.MythicConfig.AllowedIPBlocks),
			0, ipAddr.String(), database.MESSAGE_LEVEL_WARNING)
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		c.Abort()
	}
}

func RBACMiddleware(allowedRoles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		customClaims, err := GetClaims(c)
		if err != nil {
			logging.LogError(err, "Failed to get claims for RBACMiddleware")
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
		}
		operatorOperation, err := database.GetUserCurrentOperation(customClaims.UserID)
		if err != nil {
			logging.LogError(err, "Failed to get user current operation")
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
		}
		if operatorOperation.CurrentOperator.Admin || utils.SliceContains(allowedRoles, operatorOperation.ViewMode) {
			c.Set("operatorOperation", operatorOperation)
			c.Set("apitokens-id", customClaims.APITokensID)
			c.Next()
			return
		}
		logging.LogError(nil, "Unauthorized view mode for operation")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		c.Abort()

	}
}

func RBACMiddlewareAll() gin.HandlerFunc {
	return RBACMiddleware([]string{
		database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
		database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR,
		database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR,
	})
}

func RBACMiddlewareNoSpectators() gin.HandlerFunc {
	return RBACMiddleware([]string{
		database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
		database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR,
	})
}

func RBACMiddlewareOperationAdmin() gin.HandlerFunc {
	return RBACMiddleware([]string{
		database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
	})
}
