package authentication

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

type CustomClaims struct {
	jwt.StandardClaims
	UserID     int    `json:"user_id"`
	AuthMethod string `json:"auth"`
}

var (
	RefreshTokenCache = make(map[string]string)
	JWTTimespan       = 4 * time.Hour
	AUTH_METHOD_USER  = "user"
	AUTH_METHOD_API   = "api"
)

var (
	ErrUnexpectedSigningMethod         = errors.New("Unexpected signing method")
	ErrGetApiTokenOrBearer             = errors.New("Failed to get apitoken or bearer token")
	ErrBearerInvalidValue              = errors.New("Authorization bearer value is invalid")
	ErrMissingAuthorizationBearerToken = errors.New("Missing Authorization Bearer token")
	ErrMissingAuthorizationHeader      = errors.New("Missing Authorization header")
	ErrMissingCookieValue              = errors.New("Missing cookie value")
	ErrMissingJWTToken                 = errors.New("Missing JWT header")
	ErrFailedToFindRefreshToken        = errors.New("Failed to find refresh token for specified access token")
	ErrRefreshTokenMissmatch           = errors.New("Refresh token doesn't match for the given access token")
)

var (
	SQLGetIDForActiveToken = `SELECT 
    	apitokens.id, apitokens.operator_id,
    	operator.username "operator.username" 
		FROM apitokens 
		JOIN operator ON apitokens.operator_id = operator.id
		WHERE apitokens.token_value=$1 and apitokens.active=true`
)

func GetClaims(c *gin.Context) (*CustomClaims, error) {
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

	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &CustomClaims{})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok {
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
		if err := database.DB.Get(&databaseApiToken, SQLGetIDForActiveToken, tokenString); err != nil {
			logging.LogError(err, "Failed to get apitoken from database", "apitoken", tokenString)
			return err
		}
		c.Request.Header.Add("MythicSource", "scripting")
		c.Set("user_id", databaseApiToken.OperatorID)
		c.Set("username", databaseApiToken.Operator.Username)
		return nil
	}
	claims := CustomClaims{}
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

func ExtractToken(c *gin.Context) (string, error) {
	token := c.Request.Header.Get("Authorization")
	//logging.LogDebug("got Authorization header", "Authorization", token)
	if len(token) == 0 {
		return "", ErrMissingAuthorizationHeader
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
		logging.LogError(nil, "[-] No 'apitoken` or 'Authorization: Bearer' token values supplied")
		return "", ErrMissingJWTToken
	}

	//logging.LogTrace("got apitoken header", "apitoken", token)
	return token, nil
}

func CookieTokenValid(c *gin.Context) error {
	tokenString, err := ExtractCookieToken(c)
	if err != nil {
		return err
	}
	claims := CustomClaims{}
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

func generateRandomPassword(pw_length int) (string, error) {
	chars := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
	var b strings.Builder
	for i := 0; i < pw_length; i++ {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			logging.LogError(err, "[-] Failed to generate random number for password generation\n")
			return "", err
		}
		b.WriteRune(chars[nBig.Int64()])
	}
	return b.String(), nil
}

func RefreshJWT(access_token string, refresh_token string) (string, string, int, error) {
	storedRefresh, ok := RefreshTokenCache[access_token]
	if !ok {
		err := ErrFailedToFindRefreshToken
		logging.LogError(err, "access_token", access_token)
		return "", "", 0, err
	}

	if storedRefresh != refresh_token {
		err := ErrRefreshTokenMissmatch
		logging.LogError(err, "refresh_token", refresh_token, "storedRefreshToken", storedRefresh)
		return "", "", 0, err
	}

	user := databaseStructs.Operator{}
	token, err := jwt.ParseWithClaims(access_token, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			logging.LogError(ErrUnexpectedSigningMethod, "signing method", token.Header["alg"])
			return nil, fmt.Errorf("%w: %v", ErrUnexpectedSigningMethod, token.Header["alg"])
		}
		return utils.MythicConfig.JWTSecret, nil
	})

	if err != nil {
		logging.LogError(err, "Failed to parse access_token while refreshing")
		return "", "", 0, err
	}

	user.ID = token.Claims.(*CustomClaims).UserID
	newAccessToken, newRefreshToken, userID, err := GenerateJWT(user, AUTH_METHOD_USER)
	if err != nil {
		logging.LogError(err, "Failed to generate new access_token and refresh_token")
		return "", "", 0, err
	}

	delete(RefreshTokenCache, access_token)
	RefreshTokenCache[newAccessToken] = newRefreshToken
	return newAccessToken, newRefreshToken, userID, nil
}

func GenerateJWT(user databaseStructs.Operator, authMethod string) (string, string, int, error) {
	claims := CustomClaims{
		jwt.StandardClaims{
			IssuedAt:  time.Now().UTC().Unix(),
			ExpiresAt: time.Now().Add(JWTTimespan).UTC().Unix(),
		},
		user.ID,
		authMethod,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	access_token, err := token.SignedString(utils.MythicConfig.JWTSecret)
	if err != nil {
		logging.LogError(err, "Failed to generate JWT")
		return "", "", 0, err
	}

	refresh_token, err := generateRandomPassword(20)
	if err != nil {
		logging.LogError(err, "Failed to generate refresh token")
		return "", "", 0, err
	}

	RefreshTokenCache[access_token] = refresh_token
	return access_token, refresh_token, user.ID, nil
}
