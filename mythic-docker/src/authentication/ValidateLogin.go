package authentication

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func ValidateLogin(username string, password string, scriptingVersion string, fromIP string) (string, string, int, error) {
	user := databaseStructs.Operator{}
	if username == "" || password == "" {
		return "", "", 0, errors.New("must supply both username and password")
	}
	err := database.DB.Get(&user, `SELECT
		*
		FROM operator
		WHERE username=$1`, username)
	if err != nil {
		logging.LogError(err, "Failed to find username", "username", user.Username)
		return "", "", 0, err
	}
	if user.AccountType != databaseStructs.AccountTypeUser {
		return "", "", 0, errors.New("only user accounts are able to log in")
	}
	if user.Deleted {
		err = errors.New("attempted log in with a deleted user")
		logging.LogError(err, "username", user.Username)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Attempted to log in with deleted user, %s, from %s", user.Username, fromIP),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return "", "", 0, err
	}
	if !user.Active {
		err = errors.New("Attempted log in with an inactive user")
		logging.LogError(err, "username", user.Username)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Attempted to log in with inactive user, %s, from %s", user.Username, fromIP),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return "", "", 0, err
	}
	if user.ID == 1 &&
		user.FailedLoginCount >= 10 &&
		(time.Now().UTC().Sub(user.LastFailedLoginTimestamp.Time) > time.Duration(60*time.Second)) {
		err = errors.New("Throttling login attempts of default account")
		logging.LogError(err, "Throttling login attempts of default account", "username", user.Username)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Throttling login attempts of account, %s, from %s", user.Username, fromIP),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return "", "", 0, err
	}
	if !database.CheckUserPassword(user, password) {
		// failed to log in = valid username, bad password
		user.LastFailedLoginTimestamp = sql.NullTime{Valid: true, Time: time.Now().UTC()}
		user.FailedLoginCount += 1
		if user.FailedLoginCount >= 10 {
			if user.ID != 1 {
				// normal user
				user.Active = false
				logging.LogError(nil, "Deactivating user over too many failed login attempts", "username", user.Username)
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deactivating account due to failed attempts, %s, from %s", user.Username, fromIP),
					0, "", database.MESSAGE_LEVEL_WARNING)
			}
		}
		updateUserLoginStatus(user)
		return "", "", 0, errors.New(fmt.Sprintf("user %s supplied bad password", user.Username))
	}
	// successfully logged in
	user.LastLogin = sql.NullTime{Valid: true, Time: time.Now().UTC()}
	user.FailedLoginCount = 0
	updateUserLoginStatus(user)
	if scriptingVersion == "" {
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s logged in from %s", user.Username, fromIP), 0, "", database.MESSAGE_LEVEL_DEBUG)
	} else {
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s connected via Mythic Scripting (v%s) from %s", user.Username, scriptingVersion, fromIP), 0, "", database.MESSAGE_LEVEL_DEBUG)
	}
	return mythicjwt.GenerateJWT(user, mythicjwt.AUTH_METHOD_USER, 0, 0)

}
func ValidateCustomAuthProviderLogin(email string, authError string, validLogin bool, fromIP string, containerName string, IDPName string) (string, string, int, error) {
	user := databaseStructs.Operator{}
	err := database.DB.Get(&user, `SELECT
		*
		FROM operator
		WHERE email=$1`, email)
	if err != nil {
		logging.LogError(err, "Failed to find email", "email", email)
		return "", "", 0, err
	}
	if user.AccountType != databaseStructs.AccountTypeUser {
		return "", "", 0, errors.New("only user accounts are able to log in")
	}
	if user.Deleted {
		err = errors.New("attempted log in with a deleted user")
		logging.LogError(err, "username", user.Username)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Attempted to log in with deleted user, %s, from %s", user.Username, fromIP),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return "", "", 0, err
	}
	if !user.Active {
		err = errors.New("Attempted log in with an inactive user")
		logging.LogError(err, "username", user.Username)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Attempted to log in with inactive user, %s, from %s", user.Username, fromIP),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return "", "", 0, err
	}
	if user.ID == 1 &&
		user.FailedLoginCount >= 10 &&
		(time.Now().UTC().Sub(user.LastFailedLoginTimestamp.Time) > 60*time.Second) {
		err = errors.New("Throttling login attempts of default account")
		logging.LogError(err, "Throttling login attempts of default account", "username", user.Username)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Throttling login attempts of account, %s, from %s", user.Username, fromIP),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return "", "", 0, err
	}
	if !validLogin {
		// failed to log in = valid username, bad password
		user.LastFailedLoginTimestamp = sql.NullTime{Valid: true, Time: time.Now().UTC()}
		user.FailedLoginCount += 1
		if user.FailedLoginCount >= 10 {
			if user.ID != 1 {
				// normal user
				user.Active = false
				logging.LogError(nil, "Deactivating user over too many failed login attempts", "username", user.Username)
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Deactivating account due to failed attempts, %s, from %s", user.Username, fromIP),
					0, "", database.MESSAGE_LEVEL_WARNING)
			}
		}
		updateUserLoginStatus(user)
		return "", "", 0, errors.New(authError)
	}
	// successfully logged in
	user.LastLogin = sql.NullTime{Valid: true, Time: time.Now().UTC()}
	user.FailedLoginCount = 0
	updateUserLoginStatus(user)
	go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("%s logged in from %s via %s's %s", user.Username, fromIP, containerName, IDPName), 0, "", database.MESSAGE_LEVEL_DEBUG)
	return mythicjwt.GenerateJWT(user, mythicjwt.AUTH_METHOD_USER, 0, 0)

}
func updateUserLoginStatus(user databaseStructs.Operator) {
	_, err := database.DB.NamedExec(`UPDATE operator SET 
		active=:active, failed_login_count=:failed_login_count, last_login=:last_login, last_failed_login_timestamp=:last_failed_login_timestamp 
		WHERE id=:id
		`, user)
	if err != nil {
		logging.LogError(err, "Failed to update operator with successful login", "username", user.Username)
	}
}
