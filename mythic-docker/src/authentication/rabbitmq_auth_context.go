package authentication

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

const ContextKeyRabbitMQAuthContext = "rabbitmq_auth_context"

func SetRabbitMQAuthContextForGin(c *gin.Context) rabbitmq.RabbitMQAuthContext {
	authContext := rabbitmq.RabbitMQAuthContext{
		ContextID: uuid.NewString(),
	}
	if claims, err := GetClaims(c); err == nil && claims != nil {
		authContext.OperatorID = claims.UserID
		authContext.OperationID = claims.OperationID
		authContext.APITokensID = claims.APITokensID
		authContext.EventStepInstanceID = claims.EventStepInstanceID
		effectiveScopes := mythicjwt.EffectiveScopes(claims.Scopes)
		authContext.SourceScopes = append([]string{}, effectiveScopes...)
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
