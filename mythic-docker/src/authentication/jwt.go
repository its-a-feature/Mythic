package authentication

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
)

var (
	ErrUnexpectedSigningMethod         = errors.New("Unexpected signing method")
	ErrBearerInvalidValue              = errors.New("Authorization bearer value is invalid")
	ErrMissingAuthorizationBearerToken = errors.New("Missing Authorization Bearer token")
	ErrMissingAuthorizationHeader      = errors.New("Missing Authorization header")
)

const (
	ContextKeyClaims                  = "claims"
	ContextKeyAPIToken                = "apitoken_struct"
	ContextKeyUserID                  = "user_id"
	ContextKeyUsername                = "username"
	ContextKeyAPITokenID              = "apitoken_id"
	ContextKeyOperatorOperationStruct = "operatorOperation_struct"
	ContextKeyRequestOwner            = "authorization_owner"
	ContextKeyGetScopesSetFromClaims  = "authorization_scopes"
)

var (
	SQLGetIDForActiveToken = `SELECT 
		apitokens.id, apitokens.operator_id, apitokens.name, apitokens.active, apitokens.token_value, apitokens.deleted,
		apitokens.eventstepinstance_id, apitokens.token_type, apitokens.scopes, apitokens.operation_id,
		operator.username "operator.username",
		operator.account_type "operator.account_type",
		operator.current_operation_id "operator.current_operation_id",
		operator.id "operator.id", 
		operator.admin "operator.admin",
		operator.active "operator.active", 
		operator.deleted "operator.deleted",
		operator.email "operator.email", 
		operator.preferences "operator.preferences",
		operator.secrets "operator.secrets", 
		operator.view_utc_time "operator.view_utc_time",
		operator.session_version "operator.session_version",
 		operator.password "operator.password", 
 		operator.salt "operator.salt",
 		operator.last_login "operator.last_login",
 		operator.failed_login_count "operator.failed_login_count",
 		operator.last_failed_login_timestamp "operator.last_failed_login_timestamp",
 		operator.creation_time "operator.creation_time"
		FROM apitokens 
		JOIN operator ON apitokens.operator_id = operator.id
		WHERE apitokens.token_value=$1 AND operator.active=true AND operator.deleted=false
		AND apitokens.active=true AND apitokens.deleted=false AND apitokens.operation_id IS NOT NULL
		AND (operator.admin OR EXISTS(SELECT 1 FROM operatoroperation m
		 WHERE m.operator_id=operator.id AND m.operation_id=apitokens.operation_id))
		LIMIT 1`
)

func getAPITokenFromDB(c *gin.Context, tokenString string) (databaseStructs.Apitokens, error) {
	if cachedToken, ok := c.Get(ContextKeyAPIToken); ok {
		if token, ok := cachedToken.(databaseStructs.Apitokens); ok {
			return token, nil
		}
	}
	databaseApiToken := databaseStructs.Apitokens{}
	hashedTokenValue := authorization.HashAPITokenValue(tokenString)
	if err := database.DB.Get(&databaseApiToken, SQLGetIDForActiveToken, hashedTokenValue); err != nil {
		logging.LogError(err, "Failed to get apitoken from database")
		return databaseApiToken, err
	}
	c.Set(ContextKeyAPIToken, databaseApiToken)
	return databaseApiToken, nil
}

func validateAndSetAPITokenContext(c *gin.Context, tokenString string) error {
	databaseApiToken, err := getAPITokenFromDB(c, tokenString)
	if err != nil {
		return err
	}
	if !databaseApiToken.Active {
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deactivated APIToken, %s, for user %s (%s) attempted to be used",
			databaseApiToken.Name, databaseApiToken.Operator.Username, databaseApiToken.Operator.AccountType),
			int(databaseApiToken.Operator.CurrentOperationID.Int64), databaseApiToken.Name+fmt.Sprintf("%d", databaseApiToken.ID)+databaseApiToken.Operator.Username,
			database.MESSAGE_LEVEL_API, true)
		return errors.New("Deactivated APIToken attempted to be used")
	}
	if databaseApiToken.Deleted {
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deleted APIToken, \"%s\", for user %s (%s) attempted to be used",
			databaseApiToken.Name, databaseApiToken.Operator.Username, databaseApiToken.Operator.AccountType),
			int(databaseApiToken.Operator.CurrentOperationID.Int64), databaseApiToken.Name+fmt.Sprintf("%d", databaseApiToken.ID)+databaseApiToken.Operator.Username,
			database.MESSAGE_LEVEL_API, true)
		return errors.New("Deleted APIToken attempted to be used")
	}
	source := c.GetHeader("MythicSource")
	if source == "web" {
		logging.LogError(errors.New("web used apitoken"), "API Token used from the web, this is wrong")
		return errors.New("web shouldn't use apitokens")
	}
	if databaseApiToken.EventStepInstanceID.Valid {
		c.Request.Header.Set("MythicSource", "eventing")
		c.Set("eventstepinstance_id", int(databaseApiToken.EventStepInstanceID.Int64))
	} else {
		c.Request.Header.Set("MythicSource", "apitoken")
	}
	c.Set(ContextKeyUserID, databaseApiToken.OperatorID)
	c.Set(ContextKeyUsername, databaseApiToken.Operator.Username)
	c.Set(ContextKeyAPIToken, databaseApiToken)
	c.Set("account", databaseApiToken.Operator.AccountType)
	scopes := []string(databaseApiToken.Scopes)
	claims := mythicjwt.CustomClaims{
		UserID:      databaseApiToken.OperatorID,
		AuthMethod:  databaseApiToken.TokenType,
		APITokensID: databaseApiToken.ID,
		OperationID: databaseApiToken.OperationID,
		Scopes:      scopes,
	}
	if databaseApiToken.EventStepInstanceID.Valid {
		claims.EventStepInstanceID = int(databaseApiToken.EventStepInstanceID.Int64)
	}
	owner := databaseApiToken.Operator
	owner.CurrentOperationID = sql.NullInt64{Int64: int64(claims.OperationID), Valid: true}
	c.Set(ContextKeyRequestOwner, &owner)
	c.Set(ContextKeyClaims, &claims)
	return nil
}

func GetClaims(c *gin.Context) (*mythicjwt.CustomClaims, error) {
	// just get the claims out of the JWT used for the request
	if existingClaims, exists := c.Get(ContextKeyClaims); exists {
		if typedClaims, ok := existingClaims.(*mythicjwt.CustomClaims); ok {
			return typedClaims, nil
		}
	}
	tokenString, err := ExtractToken(c)
	if err != nil {
		logging.LogError(err, "failed to extract token")
		return nil, err
	}
	if strings.HasPrefix(tokenString, authorization.APITokenValuePrefix) {
		err = validateAndSetAPITokenContext(c, tokenString)
		if err != nil {
			logging.LogError(err, "failed to validate and set apitoken")
			return nil, err
		}
		if existingClaims, exists := c.Get(ContextKeyClaims); exists {
			if typedClaims, ok := existingClaims.(*mythicjwt.CustomClaims); ok {
				return typedClaims, nil
			}
		}
		logging.LogError(errors.New("failed to get claims from validated apitoken"), "failed to get claims from validated apitoken")
		return nil, errors.New("failed to get claims from validated apitoken")
	}
	if rabbitmq.IsRabbitMQAuthContextToken(tokenString) {
		authContext, err := rabbitmq.ValidateRabbitMQAuthContextToken(tokenString)
		if err != nil {
			logging.LogError(err, "failed to validate rabbitmq auth context token")
			return nil, err
		}
		if authContext.FileUUID == "" {
			err = errors.New("rabbitmq auth context token missing file uuid")
			logging.LogError(err, "invalid rabbitmq auth context token for direct file download")
			return nil, err
		}
		if authContext.APITokensID > 0 {
			authority, err := database.GetAPITokenScopesWithOperationID(authContext.APITokensID, authContext.OperationID)
			if err != nil || !authorization.AllowsScope(authority.Scopes, authorization.SCOPE_FILE_READ) {
				return nil, errors.New("direct file token parent is revoked or lacks file.read")
			}
		}
		if c.FullPath() != "/direct/download/:file_uuid" ||
			c.Param("file_uuid") != authContext.FileUUID {
			err = errors.New("rabbitmq auth context token is only valid for the matching direct file download path")
			logging.LogError(err, "invalid rabbitmq auth context token path")
			return nil, err
		}
		claims := mythicjwt.CustomClaims{
			UserID:              authContext.OperatorID,
			AuthMethod:          mythicjwt.AUTH_METHOD_CALLBACK,
			EventStepInstanceID: authContext.EventStepInstanceID,
			APITokensID:         authContext.APITokensID,
			OperationID:         authContext.OperationID,
			Scopes:              append([]string{}, authContext.SourceScopes...),
			FileUUID:            authContext.FileUUID,
		}
		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyClaims, &claims)
		return &claims, nil
	}
	claims := mythicjwt.CustomClaims{}
	_, err = jwt.ParseWithClaims(tokenString, &claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			logging.LogError(ErrUnexpectedSigningMethod, "signing method", token.Header["alg"])
			return nil, fmt.Errorf("%w: %v", ErrUnexpectedSigningMethod, token.Header["alg"])
		}
		return utils.MythicConfig.JWTSecret, nil
	})
	if err != nil {
		logging.LogError(err, "failed to parse and validate jwt")
		return nil, err
	}
	c.Set(ContextKeyUserID, claims.UserID)
	// always pull the latest from the database in case the user changed their operation
	user, err := database.GetUserFromID(claims.UserID)
	if err != nil {
		logging.LogError(err, "failed to get user from id in GetClaims")
		return nil, err
	}
	err = mythicjwt.ValidateSession(&claims, user)
	if err != nil {
		return nil, err
	}
	claims.OperationID = int(user.CurrentOperationID.Int64)
	c.Set(ContextKeyRequestOwner, user)
	c.Set(ContextKeyClaims, &claims)
	return &claims, nil
}

func TokenValid(c *gin.Context) error {
	operator, err := GetRequestUser(c)
	if err != nil {
		logging.LogError(err, "failed to get user from id")
		return err
	}
	if !operator.Active {
		logging.LogError(errors.New("user is not active"), "user is not active")
		return errors.New("user is not active")
	}
	if operator.Deleted {
		logging.LogError(errors.New("user is deleted"), "user is deleted")
		return errors.New("user is deleted")
	}
	c.Set(ContextKeyUsername, operator.Username)
	return err
}

type HasuraRequest struct {
	Headers map[string]string `json:"headers" binding:"required"`
	// Hasura sends one HTTP operation, a complete batch, or null when opening
	// a native WebSocket. Keep the raw request until the hook's scope checks.
	Request json.RawMessage `json:"request"`
}

func ExtractToken(c *gin.Context) (string, error) {
	token := c.Request.Header.Get("Authorization")
	if len(token) == 0 {
		if c.Request.Method == "POST" {
			if _, ok := c.Get("hasura"); !ok {
				var input HasuraRequest
				err := c.ShouldBindJSON(&input)
				if err != nil {
					logging.LogError(err, "Failed to find hasura request")
					return "", ErrMissingAuthorizationHeader
				}

				for key, value := range input.Headers {
					c.Request.Header.Add(key, value)
				}
				c.Set("hasura", input)
			}
		}
		token = c.Request.Header.Get("Authorization")
		if len(token) == 0 {
			return "", ErrMissingAuthorizationHeader
		}
	}
	bearerPieces := strings.Split(token, " ")
	if len(bearerPieces) != 2 {
		return "", ErrMissingAuthorizationBearerToken
	}
	if len(bearerPieces[1]) > 10 {
		return bearerPieces[1], nil
	}
	return "", ErrBearerInvalidValue
}
