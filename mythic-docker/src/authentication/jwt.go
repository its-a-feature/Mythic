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
				return nil, errors.New("Failed to get apitoken or bearer token")
			}
		}
	}
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &CustomClaims{})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*CustomClaims); ok {
		return claims, nil
	} else {
		return nil, err
	}
}

func TokenValid(c *gin.Context) error {
	tokenString, err := ExtractToken(c)
	if err != nil {
		if tokenString, err = ExtractAPIToken(c); err != nil {
			logging.LogError(err, "Failed to extract apitoken")
			return err
		} else {
			// we have an apitoken to process
			databaseApiToken := databaseStructs.Apitokens{}
			if err := database.DB.Get(&databaseApiToken, "SELECT id FROM apitokens WHERE token_value=$1 and active=true", tokenString); err != nil {
				logging.LogError(err, "Failed to get apitoken from database", "apitoken", tokenString)
				return err
			} else {
				return nil
			}
		}
	} else if len(tokenString) > 0 {
		_, err = jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				logging.LogError(errors.New("Unexpected signing method"), "signing method", token.Header["alg"])
				return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
			}
			return utils.MythicConfig.JWTSecret, nil
		})
		if err != nil {
			logging.LogError(err, "Failed to parse JWT with claims", "JWT", tokenString)
			return err
		}
	}
	return nil
}

func ExtractToken(c *gin.Context) (string, error) {
	token := c.Request.Header.Get("Authorization")
	//logging.LogDebug("got Authorization header", "Authorization", token)
	if len(token) > 0 {
		bearerPieces := strings.Split(token, " ")
		if len(bearerPieces) == 2 {
			if len(bearerPieces[1]) > 10 {
				return bearerPieces[1], nil
			} else {
				return "", errors.New("Authorization bearer value is invalid")
			}
		} else {
			return "", errors.New("Missing Authoriztion Bearer token")
		}
	}
	return "", errors.New("No Authorization header with valid value")
}

func ExtractAPIToken(c *gin.Context) (string, error) {
	token := c.Request.Header.Get("apitoken")
	if len(token) > 0 {
		logging.LogTrace("got apitoken header", "apitoken", token)
		return token, nil
	} else {
		logging.LogError(nil, "[-] No 'apitoken` or 'Authorization: Bearer' token values supplied")
		return "", errors.New("Missing JWT header")
	}
}

func CookieTokenValid(c *gin.Context) error {
	if tokenString, err := ExtractCookieToken(c); err != nil {
		return err
	} else if _, err = jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			logging.LogError(errors.New("Unexpected signing method"), "signing method", token.Header["alg"])
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}
		return utils.MythicConfig.JWTSecret, nil
	}); err != nil {
		logging.LogError(err, "Failed to parse JWT with claims", "JWT", tokenString)
		return err
	} else {
		c.Request.Header.Add("Authorization", fmt.Sprintf("Bearer: %s", tokenString))
		return nil
	}
}

func ExtractCookieToken(c *gin.Context) (string, error) {
	if token, err := c.Cookie("mythic"); err != nil {
		return "", errors.New("Missing cookie value")
	} else if len(token) > 0 {
		logging.LogTrace("got cookie header", "cookie", token)
		return token, nil
	} else {
		logging.LogDebug("Failed to find cookie value")
		return "", errors.New("Missing Cookie Value")
	}
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
	if storedRefresh, ok := RefreshTokenCache[access_token]; !ok {
		err := errors.New("Failed to find refresh token for specified access token")
		logging.LogError(err, "access_token", access_token)
		return "", "", 0, err
	} else {
		if storedRefresh != refresh_token {
			err := errors.New("Refresh token doesn't match for the given access token")
			logging.LogError(err, "refresh_token", refresh_token, "storedRefreshToken", storedRefresh)
			return "", "", 0, err
		} else {
			user := databaseStructs.Operator{}
			token, err := jwt.ParseWithClaims(access_token, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					logging.LogError(errors.New("Unexpected signing method"), "signing method", token.Header["alg"])
					return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
				}
				return utils.MythicConfig.JWTSecret, nil
			})
			if err != nil {
				logging.LogError(err, "Failed to parse access_token while refreshing")
				return "", "", 0, err
			} else {
				user.ID = token.Claims.(*CustomClaims).UserID
				if newAccessToken, newRefreshToken, userID, err := GenerateJWT(user, AUTH_METHOD_USER); err != nil {
					logging.LogError(err, "Failed to generate new access_token and refresh_token")
					return "", "", 0, err
				} else {
					delete(RefreshTokenCache, access_token)
					RefreshTokenCache[newAccessToken] = newRefreshToken
					return newAccessToken, newRefreshToken, userID, nil
				}
			}
		}
	}
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
	if access_token, err := token.SignedString(utils.MythicConfig.JWTSecret); err != nil {
		logging.LogError(err, "Failed to generate JWT")
		return "", "", 0, err
	} else {
		if refresh_token, err := generateRandomPassword(20); err != nil {
			logging.LogError(err, "Failed to generate refresh token")
			return "", "", 0, err
		} else {
			RefreshTokenCache[access_token] = refresh_token
			return access_token, refresh_token, user.ID, nil
		}
	}
}
