package authentication

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func ValidateLogin(username string, password string, scriptingVersion string, fromIP string) (string, string, int, error) {
	user := databaseStructs.Operator{}
	if username == "" || password == "" {
		return "", "", 0, errors.New("Must supply both username and password")
	}
	if err := database.DB.Get(&user, `SELECT
		*
		FROM operator
		WHERE username=$1`, username); err != nil {
		logging.LogError(err, "Failed to find username", "username", username)
		return "", "", 0, err
	} else {
		if user.Deleted {
			err = errors.New("Attempted log in with a deleted user")
			logging.LogError(err, "username", username)
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Attempted to log in with deleted user, %s, from %s", user.Username, fromIP),
				0, "", database.MESSAGE_LEVEL_WARNING)
			return "", "", 0, err
		} else if !user.Active {
			err = errors.New("Attempted log in with an inactive user")
			logging.LogError(err, "username", username)
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Attempted to log in with inactive user, %s, from %s", user.Username, fromIP),
				0, "", database.MESSAGE_LEVEL_WARNING)
			return "", "", 0, err
		} else if user.ID == 1 &&
			user.FailedLoginCount >= 10 &&
			(time.Now().UTC().Sub(user.LastFailedLoginTimestamp.Time) > time.Duration(60*time.Second)) {
			err = errors.New("Throttling login attempts of default account")
			logging.LogError(err, "Throttling login attempts of default account", "username", username)
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Throttling login attempts of account, %s, from %s", user.Username, fromIP),
				0, "", database.MESSAGE_LEVEL_WARNING)
			return "", "", 0, err
		} else if !database.CheckUserPassword(user, password) {
			// failed to log in = valid username, bad password
			user.LastFailedLoginTimestamp = sql.NullTime{Valid: true, Time: time.Now().UTC()}
			user.FailedLoginCount += 1
			if user.FailedLoginCount >= 10 {
				if user.ID != 1 {
					// normal user
					user.Active = false
					logging.LogError(nil, "Deactivating user over too many failed login attempts", "username", username)
					go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deactivating account due to failed attempts, %s, from %s", user.Username, fromIP),
						0, "", database.MESSAGE_LEVEL_WARNING)
				}
			}
			updateUserLoginStatus(user)
			return "", "", 0, errors.New("Failed login")
		} else {
			// successfully logged in
			user.LastLogin = sql.NullTime{Valid: true, Time: time.Now().UTC()}
			user.FailedLoginCount = 0
			updateUserLoginStatus(user)
			if scriptingVersion == "" {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s logged in from %s", username, fromIP), 0, "", database.MESSAGE_LEVEL_DEBUG)
			} else {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s connected via Mythic Scripting (v%s) from %s", username, scriptingVersion, fromIP), 0, "", database.MESSAGE_LEVEL_DEBUG)
			}
			return GenerateJWT(user, AUTH_METHOD_USER)
		}
	}
}

func updateUserLoginStatus(user databaseStructs.Operator) {
	if _, err := database.DB.NamedExec(`UPDATE operator SET 
		active=:active, failed_login_count=:failed_login_count, last_login=:last_login, last_failed_login_timestamp=:last_failed_login_timestamp 
		WHERE id=:id
		`, user); err != nil {
		logging.LogError(err, "Failed to update operator with successful login", "username", user.Username)
	}
}
