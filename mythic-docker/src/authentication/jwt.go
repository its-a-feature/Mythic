package authentication

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
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
	ErrLegacyAPITokenJWTDeprecated     = errors.New("Legacy JWT API tokens are no longer accepted. Generate and use a new API token.")
)

const (
	ContextKeyClaims   = "claims"
	ContextKeyAPIToken = "apitoken_struct"
	ContextKeyUserID   = "user_id"
	ContextKeyUsername = "username"
)

var (
	// LegacyAPITokenJWTCutoff // int64(time.Now().Unix()) for a specific date via iat
	LegacyAPITokenJWTCutoff = int64(1776211200) // April 15, 2026
	SQLGetIDForActiveToken  = `SELECT 
    	apitokens.id, apitokens.operator_id, apitokens.name, apitokens.active, apitokens.token_value, apitokens.deleted,
    	apitokens.eventstepinstance_id, apitokens.token_type,
    	operator.username "operator.username",
		operator.account_type "operator.account_type",
		operator.current_operation_id "operator.current_operation_id"
		FROM apitokens 
		JOIN operator ON apitokens.operator_id = operator.id
		WHERE apitokens.token_value=$1
		LIMIT 1`
)

func getAPITokenFromDB(c *gin.Context, tokenString string) (databaseStructs.Apitokens, error) {
	if cachedToken, ok := c.Get(ContextKeyAPIToken); ok {
		if token, ok := cachedToken.(databaseStructs.Apitokens); ok {
			return token, nil
		}
	}
	databaseApiToken := databaseStructs.Apitokens{}
	hashedTokenValue := mythicjwt.HashAPITokenValue(tokenString)
	if err := database.DB.Get(&databaseApiToken, SQLGetIDForActiveToken, hashedTokenValue); err != nil {
		logging.LogError(err, "Failed to get apitoken from database")
		return databaseApiToken, err
	}
	c.Set(ContextKeyAPIToken, databaseApiToken)
	return databaseApiToken, nil
}

func claimsFromAPIToken(databaseApiToken databaseStructs.Apitokens) *mythicjwt.CustomClaims {
	claims := mythicjwt.CustomClaims{
		UserID:      databaseApiToken.OperatorID,
		AuthMethod:  databaseApiToken.TokenType,
		APITokensID: databaseApiToken.ID,
		OperationID: int(databaseApiToken.Operator.CurrentOperationID.Int64),
		Scopes:      []string{mythicjwt.SCOPE_FILE_DIRECT_UPLOAD, mythicjwt.SCOPE_FILE_DIRECT_DOWNLOAD},
	}
	if databaseApiToken.EventStepInstanceID.Valid {
		claims.EventStepInstanceID = int(databaseApiToken.EventStepInstanceID.Int64)
	}
	return &claims
}

func looksLikeOpaqueAPIToken(tokenString string) bool {
	return strings.HasPrefix(tokenString, mythicjwt.APITokenValuePrefix)
}

func validateAndSetAPITokenContext(c *gin.Context, tokenString string) error {
	databaseApiToken, err := getAPITokenFromDB(c, tokenString)
	if err != nil {
		return err
	}
	if !databaseApiToken.Active {
		go func(token databaseStructs.Apitokens) {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deactivated APIToken, %s, for user %s (%s) attempted to be used",
				token.Name, token.Operator.Username, token.Operator.AccountType),
				int(token.Operator.CurrentOperationID.Int64), token.Name+fmt.Sprintf("%d", token.ID)+token.Operator.Username,
				database.MESSAGE_LEVEL_API, true)
		}(databaseApiToken)
		return errors.New("Deactivated APIToken attempted to be used")
	}
	if databaseApiToken.Deleted {
		go func(token databaseStructs.Apitokens) {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deleted APIToken, \"%s\", for user %s (%s) attempted to be used",
				token.Name, token.Operator.Username, token.Operator.AccountType),
				int(token.Operator.CurrentOperationID.Int64), token.Name+fmt.Sprintf("%d", token.ID)+token.Operator.Username,
				database.MESSAGE_LEVEL_API, true)
		}(databaseApiToken)
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
	c.Set(ContextKeyClaims, claimsFromAPIToken(databaseApiToken))
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
		return nil, err
	}
	if looksLikeOpaqueAPIToken(tokenString) {
		apiTokenErr := validateAndSetAPITokenContext(c, tokenString)
		if apiTokenErr != nil {
			logging.LogError(err, "failed to parse jwt")
			return nil, apiTokenErr
		}
		if existingClaims, exists := c.Get(ContextKeyClaims); exists {
			if typedClaims, ok := existingClaims.(*mythicjwt.CustomClaims); ok {
				return typedClaims, nil
			}
		}
		return nil, errors.New("failed to get claims from validated apitoken")
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
		logging.LogError(err, "failed to parse jwt")
		return nil, err
	}
	if claims.IssuedAt < LegacyAPITokenJWTCutoff {
		logging.LogError(ErrLegacyAPITokenJWTDeprecated,
			"auth_method", claims.AuthMethod,
			"issued_at", claims.IssuedAt,
			"cutoff", LegacyAPITokenJWTCutoff)
		return nil, ErrLegacyAPITokenJWTDeprecated
	}
	c.Set(ContextKeyUserID, claims.UserID)
	c.Set(ContextKeyClaims, &claims)
	return &claims, nil
}

func TokenValid(c *gin.Context) error {
	claims, err := GetClaims(c)
	if err != nil {
		return err
	}
	operator, err := database.GetUserFromID(claims.UserID)
	if err == nil {
		c.Set(ContextKeyUsername, operator.Username)
	}
	return nil
}

type HasuraRequest struct {
	Headers map[string]string    `json:"headers" binding:"required"`
	Request HasuraRequestGraphQL `json:"request" binding:"required"`
}
type HasuraRequestGraphQL struct {
	Variables     map[string]interface{} `json:"variables"`
	OperationName string                 `json:"operationName"`
	Query         string                 `json:"query"`
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
