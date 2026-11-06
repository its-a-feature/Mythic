package webcontroller

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	ds "github.com/its-a-feature/Mythic/database/structs"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	migrate "github.com/rubenv/sql-migrate"
	"gopkg.in/yaml.v3"
)

func TestInviteSecretsHaveNoDirectHasuraPermissions(t *testing.T) {
	contents, err := os.ReadFile(filepath.Join("..", "..", "..", "..", "hasura-docker", "metadata", "databases", "default", "tables", "public_invite_link.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	var metadata map[string]interface{}
	if err = yaml.Unmarshal(contents, &metadata); err != nil {
		t.Fatal(err)
	}
	for _, access := range []string{"select", "insert", "update", "delete"} {
		if permissions, ok := metadata[access+"_permissions"].([]interface{}); ok && len(permissions) > 0 {
			t.Fatalf("invite bearer credentials must be accessible only through scoped admin actions, found %s permissions", access)
		}
	}
}

// MYTHIC_TEST_POSTGRES_DSN must be a PostgreSQL URI with CREATEDB privileges.
// All schema, migrations, fixtures and failures are confined to a fresh database.
func newInviteRegressionDB(t *testing.T) *sqlx.DB {
	t.Helper()
	dsn := os.Getenv("MYTHIC_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set MYTHIC_TEST_POSTGRES_DSN to run isolated invite PostgreSQL regressions")
	}
	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Scheme != "postgres" && parsed.Scheme != "postgresql" {
		t.Fatal("MYTHIC_TEST_POSTGRES_DSN must be a PostgreSQL URI")
	}
	admin, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { admin.Close() })
	name := "invite_regression_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err = admin.Exec("CREATE DATABASE " + name); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := admin.Exec("DROP DATABASE " + name + " WITH (FORCE)"); err != nil {
			t.Error(err)
		}
	})
	parsed.Path = "/" + name
	db, err := sqlx.Connect("postgres", parsed.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err = db.Exec(database.Schema); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec("SET search_path TO public"); err != nil {
		t.Fatal(err)
	}
	source := &migrate.FileMigrationSource{Dir: filepath.Join("..", "..", "database", "migrations")}
	if _, err = migrate.Exec(db.DB, "postgres", source, migrate.Up); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestInviteRedemptionPostgres(t *testing.T) {
	db := newInviteRegressionDB(t)
	exec := func(t *testing.T, query string, args ...interface{}) {
		t.Helper()
		if _, err := db.Exec(query, args...); err != nil {
			t.Fatal(err)
		}
	}
	reset := func(t *testing.T) {
		t.Helper()
		exec(t, `TRUNCATE operator, operation, global_setting, invite_link RESTART IDENTITY CASCADE`)
		exec(t, `INSERT INTO operator (username,password,salt,admin,active) VALUES ('creator','password','salt',true,true)`)
		exec(t, `INSERT INTO operation (name, admin_id) VALUES ('invite-operation',1)`)
		exec(t, `INSERT INTO global_setting (name,setting) VALUES ('server_config','{"allow_invite_links":true}')`)
		exec(t, `INSERT INTO invite_link (name,short_code,operator_id,operation_id,operation_role,total_uses,total_used)
   VALUES ('test','test-secret',1,1,'operator',1,0)`)
	}
	input := UseInviteLinkInput{Username: "new-user", Password: "long-test-password", InviteCode: "test-secret", Email: "new@example.test"}
	counts := func(t *testing.T, wantUsers, wantUsed int) {
		t.Helper()
		var users, used int
		if err := db.Get(&users, `SELECT count(*) FROM operator WHERE username <> 'creator'`); err != nil {
			t.Fatal(err)
		}
		if err := db.Get(&used, `SELECT total_used FROM invite_link WHERE short_code='test-secret'`); err != nil {
			t.Fatal(err)
		}
		if users != wantUsers || used != wantUsed {
			t.Fatalf("users=%d used=%d, want users=%d used=%d", users, used, wantUsers, wantUsed)
		}
	}
	for _, tc := range []struct{ name, change string }{
		{"disabled", `UPDATE global_setting SET setting='{"allow_invite_links":false}'`},
		{"missing setting", `DELETE FROM global_setting`},
		{"inactive creator", `UPDATE operator SET active=false WHERE id=1`},
		{"deleted creator", `UPDATE operator SET deleted=true WHERE id=1`},
		{"demoted creator", `UPDATE operator SET admin=false WHERE id=1`},
		{"exhausted", `UPDATE invite_link SET total_used=1`},
		{"revoked", `UPDATE invite_link SET total_uses=0`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			reset(t)
			exec(t, tc.change)
			if _, _, err := redeemInviteLink(db, input); err == nil {
				t.Fatal("redeemed an unavailable invite")
			}
			used := 0
			if tc.name == "exhausted" {
				used = 1
			}
			counts(t, 0, used)
		})
	}
	t.Run("unknown code", func(t *testing.T) {
		reset(t)
		bad := input
		bad.InviteCode = "unknown"
		if _, _, err := redeemInviteLink(db, bad); !errors.Is(err, errInviteUnavailable) {
			t.Fatalf("unexpected error: %v", err)
		}
		counts(t, 0, 0)
	})
	for _, role := range []string{"operator", "spectator", "lead", "", "unexpected"} {
		t.Run("valid role "+role, func(t *testing.T) {
			reset(t)
			exec(t, `UPDATE invite_link SET operation_role=$1`, role)
			user, _, err := redeemInviteLink(db, input)
			if err != nil {
				t.Fatal(err)
			}
			var saved ds.Operator
			if err = db.Get(&saved, `SELECT * FROM operator WHERE id=$1`, user.ID); err != nil {
				t.Fatal(err)
			}
			if saved.Admin || !saved.Active || saved.AccountType != ds.AccountTypeUser || saved.Email.String != input.Email || saved.CurrentOperationID.Int64 != 1 || !database.CheckUserPassword(saved, input.Password) {
				t.Fatalf("incorrect account: %+v", saved)
			}
			var actualRole string
			if err = db.Get(&actualRole, `SELECT view_mode FROM operatoroperation WHERE operator_id=$1`, user.ID); err != nil {
				t.Fatal(err)
			}
			expectedRole := "operator"
			if role == "spectator" || role == "unexpected" {
				expectedRole = "spectator"
			}
			if actualRole != expectedRole {
				t.Fatalf("role=%q want %q", actualRole, expectedRole)
			}
			counts(t, 1, 1)
		})
	}
	t.Run("server only invite", func(t *testing.T) {
		reset(t)
		exec(t, `UPDATE invite_link SET operation_id=NULL,operation_role=NULL`)
		user, _, err := redeemInviteLink(db, input)
		if err != nil {
			t.Fatal(err)
		}
		if user.CurrentOperationID.Valid {
			t.Fatal("server-only invite gained operation membership")
		}
		counts(t, 1, 1)
	})
	for _, tc := range []struct{ name, ddl string }{
		{"account insert", `ALTER TABLE operator ADD CONSTRAINT fail_new_account CHECK (username <> 'new-user')`},
		{"membership insert", `ALTER TABLE operatoroperation ADD CONSTRAINT fail_membership CHECK (operator_id=1)`},
		{"current operation update", `ALTER TABLE operator ADD CONSTRAINT fail_current_operation CHECK (current_operation_id IS NULL)`},
		{"usage update", `ALTER TABLE invite_link ADD CONSTRAINT fail_usage CHECK (total_used=0)`},
	} {
		t.Run("rollback "+tc.name, func(t *testing.T) {
			reset(t)
			exec(t, tc.ddl)
			defer func() {
				for _, q := range []string{`ALTER TABLE operator DROP CONSTRAINT IF EXISTS fail_new_account`, `ALTER TABLE operatoroperation DROP CONSTRAINT IF EXISTS fail_membership`, `ALTER TABLE operator DROP CONSTRAINT IF EXISTS fail_current_operation`, `ALTER TABLE invite_link DROP CONSTRAINT IF EXISTS fail_usage`} {
					exec(t, q)
				}
			}()
			if _, _, err := redeemInviteLink(db, input); err == nil {
				t.Fatal("expected injected failure")
			}
			counts(t, 0, 0)
			var memberships int
			if err := db.Get(&memberships, `SELECT count(*) FROM operatoroperation`); err != nil {
				t.Fatal(err)
			}
			if memberships != 0 {
				t.Fatal("failed redemption left membership behind")
			}
		})
	}
	t.Run("concurrent final use", func(t *testing.T) {
		reset(t)
		results := make(chan error, 8)
		start := make(chan struct{})
		for i := 0; i < 8; i++ {
			go func(i int) {
				<-start
				request := input
				request.Username = fmt.Sprintf("concurrent-%d", i)
				_, _, err := redeemInviteLink(db, request)
				results <- err
			}(i)
		}
		close(start)
		winners := 0
		for i := 0; i < 8; i++ {
			if err := <-results; err == nil {
				winners++
			} else if !errors.Is(err, errInviteUnavailable) {
				t.Errorf("unexpected concurrent error: %v", err)
			}
		}
		if winners != 1 {
			t.Fatalf("final invite use had %d winners", winners)
		}
		counts(t, 1, 1)
	})
	t.Run("migration disables exposed links", func(t *testing.T) {
		reset(t)
		contents, err := os.ReadFile(filepath.Join("..", "..", "database", "migrations", "003003028_3.3.28.sql"))
		if err != nil {
			t.Fatal(err)
		}
		exec(t, strings.Split(string(contents), "-- +migrate Down")[0])
		if _, _, err = redeemInviteLink(db, input); !errors.Is(err, errInviteUnavailable) {
			t.Fatalf("exposed link still usable: %v", err)
		}
		counts(t, 0, 0)
	})
}
