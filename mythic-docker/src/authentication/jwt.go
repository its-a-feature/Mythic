package authentication

import (
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
	"strings"
)

var (
	ErrUnexpectedSigningMethod         = errors.New("Unexpected signing method")
	ErrGetApiTokenOrBearer             = errors.New("Failed to get apitoken or bearer token")
	ErrBearerInvalidValue              = errors.New("Authorization bearer value is invalid")
	ErrMissingAuthorizationBearerToken = errors.New("Missing Authorization Bearer token")
	ErrMissingAuthorizationHeader      = errors.New("Missing Authorization header")
	ErrMissingCookieValue              = errors.New("Missing cookie value")
	ErrMissingJWTToken                 = errors.New("Missing JWT header")
)

var (
	SQLGetIDForActiveToken = `SELECT 
    	apitokens.id, apitokens.operator_id, apitokens.name, apitokens.active, apitokens.token_value, apitokens.deleted,
    	apitokens.eventstepinstance_id, apitokens.token_type,
    	operator.username "operator.username",
		operator.account_type "operator.account_type",
		operator.current_operation_id "operator.current_operation_id"
		FROM apitokens 
		JOIN operator ON apitokens.operator_id = operator.id
		WHERE apitokens.token_value=$1`
)

func GetClaims(c *gin.Context) (*mythicjwt.CustomClaims, error) {
	// just get the claims out of the JWT used for the request
	tokenString, err := ExtractToken(c)
	if err != nil {
		if len(tokenString) == 0 {
			tokenString, err = ExtractAPIToken(c)
			if err != nil {
				return nil, err
			}
			if len(tokenString) == 0 {
				return nil, ErrGetApiTokenOrBearer
			}
		}
	}

	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &mythicjwt.CustomClaims{})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*mythicjwt.CustomClaims); ok {
		c.Set("user_id", claims.UserID)
		return claims, nil
	}

	return nil, err
}

func TokenValid(c *gin.Context) error {
	tokenString, err := ExtractToken(c)
	if err != nil {
		tokenString, err = ExtractAPIToken(c)
		if err != nil {
			logging.LogError(err, "Failed to extract apitoken")
			return err
		}
		// we have an apitoken to process
		databaseApiToken := databaseStructs.Apitokens{}
		if err = database.DB.Get(&databaseApiToken, SQLGetIDForActiveToken, tokenString); err != nil {
			logging.LogError(err, "Failed to get apitoken from database", "apitoken", tokenString)
			return err
		}
		if !databaseApiToken.Active {
			go func(token databaseStructs.Apitokens) {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deactivated APIToken, %s, for user %s (%s) attempted to be used",
					token.Name, token.Operator.Username, token.Operator.AccountType),
					int(token.Operator.CurrentOperationID.Int64), "apitoken usage",
					database.MESSAGE_LEVEL_WARNING)
			}(databaseApiToken)
			return errors.New("Deactivated APIToken attempted to be used")
		}
		if databaseApiToken.Deleted {
			go func(token databaseStructs.Apitokens) {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deleted APIToken, \"%s\", for user %s (%s) attempted to be used",
					token.Name, token.Operator.Username, token.Operator.AccountType),
					int(token.Operator.CurrentOperationID.Int64), token.Name+fmt.Sprintf("%d", token.ID)+token.Operator.Username,
					database.MESSAGE_LEVEL_WARNING)
			}(databaseApiToken)
			return errors.New("Deleted APIToken attempted to be used")
		}
		source := c.GetHeader("MythicSource")
		if source == "web" {
			logging.LogError(errors.New("web used apitoken"), "API Token used from the web, this is wrong")
			return errors.New("web shouldn't use apitokens")
		}
		if databaseApiToken.EventStepInstanceID.Valid {
			c.Request.Header.Add("MythicSource", "eventing")
			c.Set("eventstepinstance_id", int(databaseApiToken.EventStepInstanceID.Int64))
		} else {
			c.Request.Header.Add("MythicSource", "apitoken")
		}
		c.Set("apitoken_logging_struct", databaseApiToken)
		c.Set("user_id", databaseApiToken.OperatorID)
		c.Set("username", databaseApiToken.Operator.Username)
		c.Set("apitoken", databaseApiToken.Name)
		c.Set("account", databaseApiToken.Operator.AccountType)
		/*
			if hasura, ok := c.Get("hasura"); ok {
				logging.LogInfo("got hasura info", "hasura", hasura)
			} else {
				logging.LogInfo("no hasura info yet")
			}
			go func(token databaseStructs.Apitokens) {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("APIToken, %s, for user %s (%s) just used",
					token.Name, token.Operator.Username, token.Operator.AccountType),
					int(token.Operator.CurrentOperationID.Int64), token.TokenValue,
					database.MESSAGE_LEVEL_DEBUG)
			}(databaseApiToken)

		*/
		return nil
	}
	claims := mythicjwt.CustomClaims{}
	if len(tokenString) > 0 {
		_, err = jwt.ParseWithClaims(tokenString, &claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				logging.LogError(ErrUnexpectedSigningMethod, "signing method", token.Header["alg"])
				return nil, fmt.Errorf("%w: %v", ErrUnexpectedSigningMethod, token.Header["alg"])
			}
			return utils.MythicConfig.JWTSecret, nil
		})
		if err != nil {
			logging.LogError(err, "Failed to parse JWT with claims", "JWT", tokenString)
			return err
		}
		operator, err := database.GetUserFromID(claims.UserID)
		if err == nil {
			c.Set("username", operator.Username)
		}
		c.Set("user_id", claims.UserID)
		return nil
	}
	return errors.New("failed to get token")
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
	//logging.LogDebug("got Authorization header", "Authorization", token)
	if len(token) == 0 {
		token = c.Request.Header.Get("apitoken")
	}
	if len(token) == 0 {
		if c.Request.Method == "POST" {
			if _, ok := c.Get("hasura"); !ok {
				// don't try to double process, only do this once
				/*
					var buf bytes.Buffer
					tee := io.TeeReader(c.Request.Body, &buf)
					body, _ := ioutil.ReadAll(tee)
					c.Request.Body = ioutil.NopCloser(&buf)
					logging.LogInfo("raw hasura info", "raw body", string(body))

				*/
				var input HasuraRequest
				if err := c.ShouldBindJSON(&input); err != nil {
					logging.LogError(err, "Failed to find hasura request")
					return "", ErrMissingAuthorizationHeader
				}
				for key, value := range input.Headers {
					c.Request.Header.Add(key, value)
				}
				c.Set("hasura", input)
				//logging.LogInfo("hasura info", "hasura", input)
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

func ExtractAPIToken(c *gin.Context) (string, error) {
	token := c.Request.Header.Get("apitoken")
	if len(token) == 0 {
		if c.Request.Method == "POST" {
			if _, ok := c.Get("hasura"); !ok {
				// don't try to double process, only do this once
				/*
					var buf bytes.Buffer
					tee := io.TeeReader(c.Request.Body, &buf)
					body, _ := ioutil.ReadAll(tee)
					c.Request.Body = ioutil.NopCloser(&buf)
					logging.LogInfo("raw hasura info", "raw body", string(body))

				*/
				var input HasuraRequest
				if err := c.ShouldBindJSON(&input); err != nil {
					logging.LogError(err, "Failed to find hasura request")
					return "", ErrMissingAuthorizationHeader
				}
				for key, value := range input.Headers {
					c.Request.Header.Add(key, value)
				}
				c.Set("hasura", input)
				//logging.LogInfo("hasura info", "hasura", input)
			}
		}
		token = c.Request.Header.Get("apitoken")
		if len(token) == 0 {
			if !strings.HasPrefix(c.Request.URL.Path, "/direct/") {
				logging.LogError(nil, "[-] No 'apitoken` or 'Authorization: Bearer' token values supplied")
			}
			return "", ErrMissingJWTToken
		}
	}
	//logging.LogTrace("got apitoken header", "apitoken", token)
	return token, nil
}

func CookieTokenValid(c *gin.Context) error {
	tokenString, err := ExtractCookieToken(c)
	if err != nil {
		return err
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
		logging.LogError(err, "Failed to parse JWT with claims", "JWT", tokenString)
		return err
	}
	c.Set("user_id", claims.UserID)
	operator, err := database.GetUserFromID(claims.UserID)
	if err == nil {
		c.Set("username", operator.Username)
	}
	c.Request.Header.Add("Authorization", fmt.Sprintf("Bearer: %s", tokenString))
	c.Request.Header.Add("MythicSource", "cookie")
	return nil
}

func ExtractCookieToken(c *gin.Context) (string, error) {
	token, err := c.Cookie("mythic")
	if err != nil {
		return "", ErrMissingCookieValue
	}
	if len(token) > 0 {
		return token, nil
	}
	logging.LogDebug("Failed to find cookie value")
	return "", ErrMissingCookieValue
}
