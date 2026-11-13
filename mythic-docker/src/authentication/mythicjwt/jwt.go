package mythicjwt

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

type CustomClaims struct {
	// OperatorSessionVersion allows us to invalidate all active sessions for an account
	// this increments automatically when key attributes about a user account change via database trigger in 003003027
	OperatorSessionVersion int64 `json:"operator_session_version"`
	// SessionUUID allows us to invalidate a single logon session and its refresh tokens by proxy
	SessionUUID string `json:"session_uuid,omitempty"`
	jwt.StandardClaims
	UserID              int      `json:"user_id"`
	AuthMethod          string   `json:"auth"`
	EventStepInstanceID int      `json:"eventstepinstance_id"`
	APITokensID         int      `json:"apitokens_id"`
	OperationID         int      `json:"operation_id"`
	Scopes              []string `json:"scopes,omitempty"`
	FileUUID            string   `json:"file_uuid,omitempty"`
}

var (
	RefreshTokenCache           = make(map[string]string)
	RefreshTokenCacheLock       = sync.RWMutex{}
	JWTTimespan                 = 4 * time.Hour
	AUTH_METHOD_USER            = "user" // standard access_token through web UI
	AUTH_METHOD_API             = "api"  // apitoken for usage with API requests (not web)
	AUTH_METHOD_EVENT           = "event"
	AUTH_METHOD_TASK            = "task"
	AUTH_METHOD_ON_START        = "on_start"
	AUTH_METHOD_PAYLOAD         = "payload"
	AUTH_METHOD_CALLBACK        = "callback"
	AUTH_METHOD_CHAT            = "chat"
	ErrFailedToFindRefreshToken = errors.New("Failed to find refresh token for specified access token")
	ErrRefreshTokenMissmatch    = errors.New("Refresh token doesn't match for the given access token")
	ErrUnexpectedSigningMethod  = errors.New("Unexpected signing method")
)

func generateRandomPassword(passwordLength int) (string, error) {
	chars := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
	var b strings.Builder
	for i := 0; i < passwordLength; i++ {
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
		logging.LogError(err, "Failed to refresh an access token and find it within RefreshTokenCache")
		return "", "", 0, err
	}

	if storedRefresh != refresh_token {
		err := ErrRefreshTokenMissmatch
		logging.LogError(err, "Supplied refresh token doesn't match what Mythic has")
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
	operator, err := database.GetUserFromID(user.ID)
	if err != nil {
		logging.LogError(err, "Failed to get user from id")
		return "", "", 0, err
	}
	if err := ValidateSession(customClaims, operator); err != nil {
		return "", "", 0, err
	}

	// Consume the refresh pair before issuing its replacement so concurrent
	// refreshes cannot both succeed.
	RefreshTokenCacheLock.Lock()
	if RefreshTokenCache[access_token] != refresh_token {
		RefreshTokenCacheLock.Unlock()
		return "", "", 0, ErrFailedToFindRefreshToken
	}
	delete(RefreshTokenCache, access_token)
	RefreshTokenCacheLock.Unlock()
	newAccessToken, newRefreshToken, userID, err := generateJWT(*operator, customClaims.AuthMethod, customClaims.EventStepInstanceID, customClaims.APITokensID, customClaims.SessionUUID)
	if err != nil {
		logging.LogError(err, "Failed to generate new access_token and refresh_token")
		return "", "", 0, err
	}
	return newAccessToken, newRefreshToken, userID, nil
}

func GenerateJWT(user databaseStructs.Operator, authMethod string, eventStepInstanceID int, APITokensID int) (string, string, int, error) {
	return generateJWT(user, authMethod, eventStepInstanceID, APITokensID, uuid.NewString())
}

func generateJWT(user databaseStructs.Operator, authMethod string, eventStepInstanceID int, APITokensID int, sessionID string) (string, string, int, error) {
	jwtStandardClaims := jwt.StandardClaims{
		IssuedAt:  time.Now().UTC().Unix(),
		ExpiresAt: time.Now().Add(JWTTimespan).UTC().Unix(),
	}
	claims := CustomClaims{
		OperatorSessionVersion: user.SessionVersion,
		StandardClaims:         jwtStandardClaims,
		UserID:                 user.ID,
		AuthMethod:             authMethod,
		SessionUUID:            sessionID,
		EventStepInstanceID:    eventStepInstanceID,
		APITokensID:            APITokensID,
		OperationID:            int(user.CurrentOperationID.Int64),
		Scopes:                 []string{authorization.SCOPE_ALL},
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

func GenerateScopedJWT(user databaseStructs.Operator, scopes []string, fileUUID string, ttl time.Duration, eventStepInstanceID int, APITokensID int) (string, int, error) {
	jwtStandardClaims := jwt.StandardClaims{
		IssuedAt:  time.Now().UTC().Unix(),
		ExpiresAt: time.Now().Add(ttl).UTC().Unix(),
	}
	claims := CustomClaims{
		OperatorSessionVersion: user.SessionVersion,
		StandardClaims:         jwtStandardClaims,
		UserID:                 user.ID,
		AuthMethod:             AUTH_METHOD_PAYLOAD,
		OperationID:            int(user.CurrentOperationID.Int64),
		Scopes:                 scopes,
		EventStepInstanceID:    eventStepInstanceID,
		APITokensID:            APITokensID,
		FileUUID:               fileUUID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	access_token, err := token.SignedString(utils.MythicConfig.JWTSecret)
	if err != nil {
		logging.LogError(err, "Failed to generate scoped JWT")
		return "", 0, err
	}
	return access_token, user.ID, nil
}

// ValidateSession is shared by request authentication and refresh. Old tokens
// without a version are intentionally invalid after the migration.
func ValidateSession(claims *CustomClaims, operator *databaseStructs.Operator) error {
	if !operator.Active || operator.Deleted || claims.OperatorSessionVersion != operator.SessionVersion {
		// invalidate all old access_tokens because something fundamentally changed about the user
		return errors.New("operator credentials have been revoked")
	}
	if claims.AuthMethod == AUTH_METHOD_USER {
		if claims.SessionUUID == "" {
			return errors.New("missing session id")
		}
		// check to see if a specific session is invalidated, like logging out of one computer
		var revoked bool
		if err := database.DB.Get(&revoked, `SELECT EXISTS (SELECT 1 FROM revoked_session WHERE id=$1)`, claims.SessionUUID); err != nil {
			return err
		}
		if revoked {
			return errors.New("session has been logged out")
		}
	}
	return nil
}

func RevokeSession(claims *CustomClaims) error {
	if claims.AuthMethod != AUTH_METHOD_USER || claims.SessionUUID == "" {
		return errors.New("not a user session")
	}
	// Refresh preserves the session ID, so one tombstone also revokes every
	// access/refresh token descended from this login.
	_, err := database.DB.Exec(`INSERT INTO revoked_session (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, claims.SessionUUID)
	return err
}
