package authentication

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

const ContextKeyRabbitMQAuthContext = "rabbitmq_auth_context"

func SetRabbitMQAuthContextForGin(c *gin.Context) rabbitmq.RabbitMQAuthContext {
	if cached, ok := c.Get(ContextKeyRabbitMQAuthContext); ok {
		return cached.(rabbitmq.RabbitMQAuthContext)
	}
	authContext := rabbitmq.RabbitMQAuthContext{
		ContextID: uuid.NewString(),
	}
	if claims, err := GetClaims(c); err == nil && claims != nil {
		authContext.OperatorID = claims.UserID
		authContext.OperationID = claims.OperationID
		authContext.APITokensID = claims.APITokensID
		authContext.EventStepInstanceID = claims.EventStepInstanceID
		authContext.SourceScopes = append([]string{}, claims.Scopes...)
	}
	c.Set(ContextKeyRabbitMQAuthContext, authContext)
	return authContext
}

func RabbitMQAuthContextFromGin(c *gin.Context) rabbitmq.RabbitMQAuthContext {
	if c == nil {
		return rabbitmq.RabbitMQAuthContext{}
	}
	if existingContext, ok := c.Get(ContextKeyRabbitMQAuthContext); ok {
		if authContext, ok := existingContext.(rabbitmq.RabbitMQAuthContext); ok {
			return authContext
		}
	}
	return SetRabbitMQAuthContextForGin(c)
}
