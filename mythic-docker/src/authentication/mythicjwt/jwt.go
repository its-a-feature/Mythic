package mythicjwt

import (
	"crypto/rand"
	"errors"
	"fmt"
	"github.com/golang-jwt/jwt"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"math/big"
	"strings"
	"sync"
	"time"
)

type CustomClaims struct {
	jwt.StandardClaims
	UserID              int    `json:"user_id"`
	AuthMethod          string `json:"auth"`
	EventStepInstanceID int    `json:"eventstepinstance_id"`
	APITokensID         int    `json:"apitokens_id"`
	OperationID         int    `json:"operation_id"`
}

var (
	RefreshTokenCache             = make(map[string]string)
	RefreshTokenCacheLock         = sync.RWMutex{}
	JWTTimespan                   = 4 * time.Hour
	AUTH_METHOD_USER              = "user" // standard access_token through web UI
	AUTH_METHOD_API               = "api"  // apitoken for usage with API requests (not web)
	AUTH_METHOD_EVENT             = "event"
	AUTH_METHOD_TASK              = "task"
	AUTH_METHOD_GRAPHQL_SPECTATOR = "graphql_spectator"
	ErrFailedToFindRefreshToken   = errors.New("Failed to find refresh token for specified access token")
	ErrRefreshTokenMissmatch      = errors.New("Refresh token doesn't match for the given access token")
	ErrUnexpectedSigningMethod    = errors.New("Unexpected signing method")
)

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
	RefreshTokenCacheLock.RLock()
	storedRefresh, ok := RefreshTokenCache[access_token]
	RefreshTokenCacheLock.RUnlock()
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
	customClaims := token.Claims.(*CustomClaims)
	user.ID = customClaims.UserID
	newAccessToken, newRefreshToken, userID, err := GenerateJWT(user, customClaims.AuthMethod, customClaims.EventStepInstanceID, customClaims.APITokensID)
	if err != nil {
		logging.LogError(err, "Failed to generate new access_token and refresh_token")
		return "", "", 0, err
	}
	RefreshTokenCacheLock.Lock()
	delete(RefreshTokenCache, access_token)
	RefreshTokenCache[newAccessToken] = newRefreshToken
	RefreshTokenCacheLock.Unlock()
	return newAccessToken, newRefreshToken, userID, nil
}

func GenerateJWT(user databaseStructs.Operator, authMethod string, eventStepInstanceID int, APITokensID int) (string, string, int, error) {
	claims := CustomClaims{
		jwt.StandardClaims{
			IssuedAt:  time.Now().UTC().Unix(),
			ExpiresAt: time.Now().Add(JWTTimespan).UTC().Unix(),
		},
		user.ID,
		authMethod,
		eventStepInstanceID,
		APITokensID,
		int(user.CurrentOperationID.Int64),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	access_token, err := token.SignedString(utils.MythicConfig.JWTSecret)
	if err != nil {
		logging.LogError(err, "Failed to generate JWT")
		return "", "", 0, err
	}
	if authMethod == AUTH_METHOD_USER {
		refresh_token, err := generateRandomPassword(20)
		if err != nil {
			logging.LogError(err, "Failed to generate refresh token")
			return "", "", 0, err
		}
		RefreshTokenCacheLock.Lock()
		RefreshTokenCache[access_token] = refresh_token
		RefreshTokenCacheLock.Unlock()
		return access_token, refresh_token, user.ID, nil
	}
	return access_token, "", user.ID, nil
}
