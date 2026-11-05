package rabbitmq

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"sync/atomic"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/jmoiron/sqlx"
)

// Use one pooled connection so a write cannot hide an unconsumed SELECT by
// borrowing a second connection. No PostgreSQL or RabbitMQ service is needed.
type syncCursorConnector struct {
	iterationErr error
	writes       atomic.Int64
}
type syncCursorConn struct{ state *syncCursorConnector }
type syncCursorRows struct {
	state *syncCursorConnector
	index int
}

func (s *syncCursorConnector) Connect(context.Context) (driver.Conn, error) {
	return &syncCursorConn{s}, nil
}
func (s *syncCursorConnector) Driver() driver.Driver { return syncCursorDriver{} }

type syncCursorDriver struct{}

func (syncCursorDriver) Open(string) (driver.Conn, error) { return nil, errors.New("use connector") }
func (c *syncCursorConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (c *syncCursorConn) Close() error              { return nil }
func (c *syncCursorConn) Begin() (driver.Tx, error) { return nil, errors.New("unexpected transaction") }
func (c *syncCursorConn) QueryContext(context.Context, string, []driver.NamedValue) (driver.Rows, error) {
	return &syncCursorRows{state: c.state}, nil
}
func (c *syncCursorConn) ExecContext(context.Context, string, []driver.NamedValue) (driver.Result, error) {
	c.state.writes.Add(1)
	return driver.RowsAffected(1), nil
}
func (r *syncCursorRows) Columns() []string { return []string{"id"} }
func (r *syncCursorRows) Close() error      { return nil }
func (r *syncCursorRows) Next(dest []driver.Value) error {
	if r.index == 1 && r.state.iterationErr != nil {
		return r.state.iterationErr
	}
	if r.index == 2 {
		return io.EOF
	}
	r.index++
	dest[0] = int64(r.index)
	return nil
}

func TestContainerSyncDrainsRowsBeforeWrites(t *testing.T) {
	cases := []struct {
		name string
		run  func() error
	}{
		{"c2_parameters", func() error {
			return updateC2Parameters(C2SyncMessage{}, databaseStructs.C2profile{ID: 1})
		}},
		{"build_parameters", func() error {
			return updatePayloadTypeBuildParameters(PayloadTypeSyncMessage{}, databaseStructs.Payloadtype{ID: 1})
		}},
		{"c2_profiles", func() error {
			return updatePayloadTypeC2Profiles(PayloadTypeSyncMessage{}, databaseStructs.Payloadtype{ID: 1})
		}},
		{"commands", func() error {
			return updatePayloadTypeCommands(PayloadTypeSyncMessage{}, databaseStructs.Payloadtype{ID: 1})
		}},
		{"command_parameters", func() error {
			return updatePayloadTypeCommandParameters(PayloadTypeSyncMessage{}, databaseStructs.Payloadtype{ID: 1}, nil, databaseStructs.Command{ID: 1})
		}},
		{"command_browser_scripts", func() error {
			return updatePayloadTypeCommandBrowserScripts(PayloadTypeSyncMessage{}, Command{}, databaseStructs.Command{ID: 1})
		}},
		{"add_operator_scripts", func() error { return addBrowserScriptToAllOperators(databaseStructs.Browserscript{CommandID: 1}) }},
		{"update_operator_scripts", func() error { return updateBrowserScriptForAllOperators(databaseStructs.Browserscript{CommandID: 1}) }},
		{"remove_operator_scripts", func() error { return removeBrowserScriptFromAllOperators(databaseStructs.Browserscript{CommandID: 1}) }},
		{"attack_mappings", func() error {
			return updatePayloadTypeCommandMitreAttack(PayloadTypeSyncMessage{}, Command{}, databaseStructs.Command{ID: 1})
		}},
	}
	original := database.DB
	defer func() { database.DB = original }()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			for _, injectError := range []bool{false, true} {
				t.Run(map[bool]string{false: "complete", true: "iteration_error"}[injectError], func(t *testing.T) {
					state := &syncCursorConnector{}
					sentinel := errors.New("interrupted SELECT")
					if injectError {
						state.iterationErr = sentinel
					}
					db := sqlx.NewDb(sql.OpenDB(state), "postgres")
					defer db.Close()
					db.SetMaxOpenConns(1)
					database.DB = db
					done := make(chan error, 1)
					go func() { done <- tc.run() }()
					var err error
					select {
					case err = <-done:
					case <-time.After(time.Second):
						// Release a broken implementation before failing, so no goroutine retains
						// database.DB or one of the production sync mutexes after this case.
						db.SetMaxOpenConns(10)
						if pingErr := db.Ping(); pingErr != nil {
							t.Fatal(pingErr)
						}
						select {
						case <-done:
						case <-time.After(time.Second):
							t.Fatal("sync failed to finish after releasing pool")
						}
						t.Fatal("sync requested another connection while its SELECT was still open")
					}
					if injectError {
						if !errors.Is(err, sentinel) {
							t.Fatalf("iteration error lost: %v", err)
						}
						if state.writes.Load() != 0 {
							t.Fatalf("wrote after incomplete SELECT: %d", state.writes.Load())
						}
					} else {
						if err != nil {
							t.Fatal(err)
						}
						if state.writes.Load() < 2 {
							t.Fatalf("expected writes for both selected rows, got %d", state.writes.Load())
						}
					}
				})
			}
		})
	}
}
