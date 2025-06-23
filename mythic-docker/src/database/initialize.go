package database

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/jmoiron/sqlx"
	migrate "github.com/rubenv/sql-migrate"
)

var DB *sqlx.DB
var currentMigrationVersion int64 = 3003011

// initial structs made with './tables-to-go -u mythic_user -p [password here] -h [ip here] -v -d mythic_db -of output -pn database_structs'
// package pulled from https://github.com/fraenky8/tables-to-go

func Initialize() {
	DB = getNewDbConnection()
	logging.LogInfo("Successfully connected to database, initializing...")
	operators := []databaseStructs.Operator{}
	var newOperation databaseStructs.Operation
	if err := DB.Select(&operators, "SELECT * FROM operator LIMIT 1"); err != nil {
		if AreDatabaseErrorsEqual(err, UndefinedTable) {
			// need to setup the database
			logging.LogInfo("Creating the database schema")
			_, err = DB.Exec(Schema)
			if err != nil {
				logging.LogFatalError(err, "Failed to initialize postgres schema")
			}
			logging.LogInfo("Disconnecting from database and reconnecting to load new schema")
			DB.Close()
			DB = getNewDbConnection()
			// we need to initialize the admin user and operation
			salt := uuid.NewString()
			newUser := databaseStructs.Operator{
				Username: utils.MythicConfig.AdminUser,
				Salt:     salt,
				Admin:    true,
				Active:   true,
			}
			newOperation = databaseStructs.Operation{
				Name:    utils.MythicConfig.DefaultOperationName,
				Webhook: utils.MythicConfig.DefaultOperationWebhook,
				Channel: utils.MythicConfig.DefaultOperationChannel,
			}
			newUser.Password = HashUserPassword(newUser, utils.MythicConfig.AdminPassword)
			if statement, err := DB.PrepareNamed(`INSERT INTO operator 
				(username, "password", salt, "admin", active)
				VALUES
				(:username, :password, :salt, :admin, :active)
				RETURNING id`); err != nil {
				logging.LogError(err, "Failed to prep creating the original admin user")
			} else if err := statement.Get(&newUser.ID, newUser); err != nil {
				logging.LogError(err, "Failed to create new operator in database")
			} else {
				newOperation.AdminID = newUser.ID
				if statement, err = DB.PrepareNamed(`INSERT INTO operation
					("name", admin_id, webhook, channel)
					VALUES
					(:name, :admin_id, :webhook, :channel)
					RETURNING id`); err != nil {
					logging.LogError(err, "Failed to create initial operation statement")
				} else if err := statement.Get(&newOperation.ID, newOperation); err != nil {
					logging.LogError(err, "Failed to create initial operation")
				} else {
					// now we need to make the new User's current operation the new operation
					newUser.CurrentOperationID.Valid = true
					newUser.CurrentOperationID.Int64 = int64(newOperation.ID)
					if _, err := DB.NamedExec(`UPDATE operator
						SET current_operation_id=:current_operation_id
						WHERE id=:id`, newUser); err != nil {
						logging.LogError(err, "Failed to set the new user's default operation")
					}
					operatorOperation := databaseStructs.Operatoroperation{
						OperatorID:  newUser.ID,
						OperationID: newOperation.ID,
						ViewMode:    "lead",
					}
					if _, err := DB.NamedExec(`INSERT INTO operatoroperation
						(operator_id, operation_id, view_mode)
						VALUES
						(:operator_id, :operation_id, :view_mode)`, operatorOperation); err != nil {
						logging.LogError(err, "Failed to create operator operation mapping for new operator and new operation")
					}

				}
			}

		} else {
			// got some other sort of error, abort
			logging.LogFatalError(err, "pq error", GetDatabaseErrorString(err))
		}
	}
	// background process to reconnect to the database if we lose connection
	go checkDBConnection()
	migrations := &migrate.FileMigrationSource{
		Dir: "database/migrations",
	}
	migrationList, err := migrations.FindMigrations()
	if err != nil {
		logging.LogFatalError(err, "Failed to find migrations")
	}
	currentMigrationVersionID := ""
	for i, _ := range migrationList {
		logging.LogInfo("migration info", "NumberPrefixMatches", migrationList[i].NumberPrefixMatches(),
			"version", migrationList[i].VersionInt(), "id", migrationList[i].Id)
		if migrationList[i].VersionInt() == currentMigrationVersion {
			currentMigrationVersionID = migrationList[i].Id
		}
	}
	if currentMigrationVersionID == "" {
		logging.LogFatalError(nil, "Current migration version set to a non-existing file", "version", currentMigrationVersion)
	}
	// Migrations generated via https://github.com/djrobstep/migra/blob/master/docs/options.md
	migrate.SetSchema("public")
	migrate.SetTable("mythic_server_migration_tracking")
	n, err := migrate.ExecVersion(DB.DB, "postgres", migrations, migrate.Up, currentMigrationVersion)
	if err != nil {
		//logging.LogError(err, "Error from migrate.ExecVersion")
		appliedMigrations := []migrate.MigrationRecord{}
		if err2 := DB.Select(&appliedMigrations, `SELECT * FROM mythic_server_migration_tracking`); err2 != nil {
			logging.LogFatalError(err2, "Failed to get applied migrations from database")
		}
		successfullyAppliedMigrations := false
		for i, _ := range appliedMigrations {
			if appliedMigrations[i].Id == currentMigrationVersionID && !appliedMigrations[i].AppliedAt.IsZero() {
				successfullyAppliedMigrations = true
			}
		}
		if !successfullyAppliedMigrations {
			logging.LogFatalError(err, "Failed to apply all necessary migrations for specified version", "version", currentMigrationVersion)
		}
	}
	logging.LogInfo("Applied migrations up to current version", "version", currentMigrationVersion, "applied", n)
	if newOperation.ID > 0 {
		CreateOperationBotForOperation(newOperation)
	}
	initializeMitreAttack()
	logging.LogInfo("Database Initialized")
}

func checkDBConnection() {
	// every 30s ping the database to make sure it's still alive and our connection is good
	for {
		if err := DB.Ping(); err != nil {
			// we failed to ping the database, so try to reconnect
			DB = getNewDbConnection()
			logging.LogInfo("Successfully reconnected to database")
		}
		time.Sleep(DATABASE_ALIVE_CHECK_DELAY)
	}
}

func getNewDbConnection() *sqlx.DB {
	for {
		logging.LogInfo("Attempting to connect to database...", "host", utils.MythicConfig.PostgresHost, "port", utils.MythicConfig.PostgresPort)
		conn, err := sqlx.Connect("postgres", fmt.Sprintf("user='%s' password='%s' host='%s' port='%d' dbname='%s' sslmode=disable connect_timeout=10",
			utils.MythicConfig.PostgresUser,
			utils.MythicConfig.PostgresPassword,
			utils.MythicConfig.PostgresHost,
			utils.MythicConfig.PostgresPort,
			utils.MythicConfig.PostgresDB),
		)
		if err != nil {
			logging.LogError(err, "Failed to connect to database", "host", utils.MythicConfig.PostgresHost, "port", utils.MythicConfig.PostgresPort)
			time.Sleep(RETRY_CONNECT_DELAY)
		} else {
			conn.SetMaxOpenConns(40)
			conn.SetMaxIdleConns(10)
			conn.SetConnMaxLifetime(0)
			conn.SetConnMaxIdleTime(0)
			return conn
		}
	}
}
