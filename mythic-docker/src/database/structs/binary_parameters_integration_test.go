package databaseStructs

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"os"
	"reflect"
	"testing"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// Set MYTHIC_TEST_POSTGRES_DSN to a lib/pq keyword/value DSN for a disposable
// database. Only session-local temporary tables are created by this test.
func TestPostgresParameterCompatibility(t *testing.T) {
	dsn := os.Getenv("MYTHIC_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set MYTHIC_TEST_POSTGRES_DSN for PostgreSQL integration coverage")
	}
	for _, mode := range []string{"no", "yes"} {
		t.Run("binary_parameters="+mode, func(t *testing.T) {
			db, err := sqlx.Connect("postgres", dsn+" binary_parameters="+mode)
			if err != nil {
				t.Fatal(err)
			}
			defer db.Close()
			db.SetMaxOpenConns(1)
			db.SetMaxIdleConns(1)
			_, err = db.Exec(`CREATE TEMP TABLE parameter_compatibility (
   id serial PRIMARY KEY, object jsonb, items jsonb, blob bytea,
   optional_key bytea, scopes text[], note text)`)
			if err != nil {
				t.Fatal(err)
			}
			type record struct {
				ID          int             `db:"id"`
				Object      MythicJSONText  `db:"object"`
				Items       MythicJSONArray `db:"items"`
				Blob        []byte          `db:"blob"`
				OptionalKey *[]byte         `db:"optional_key"`
				Scopes      pq.StringArray  `db:"scopes"`
				Note        string          `db:"note"`
			}
			key := []byte{0, 255, 128, 92, 39}
			sample := record{Object: MythicJSONText(`{"text":"雪\\path","nested":{"ok":true}}`), Items: MythicJSONArray(`["a","雪",null]`), Blob: []byte{0, 1, 255, 128, 92, 39}, OptionalKey: &key, Scopes: pq.StringArray{"read", "quoted\"scope", "雪"}, Note: "text ' \\ 雪"}
			insert := `INSERT INTO parameter_compatibility(object,items,blob,optional_key,scopes,note)
   VALUES(:object,:items,:blob,:optional_key,:scopes,:note)`
			if _, err = db.NamedExec(insert, sample); err != nil {
				t.Fatal("NamedExec:", err)
			}
			stmt, err := db.PrepareNamed(insert + " RETURNING id")
			if err != nil {
				t.Fatal(err)
			}
			var preparedID int
			err = stmt.Get(&preparedID, sample)
			stmt.Close()
			if err != nil {
				t.Fatal("PrepareNamed/Get:", err)
			}
			tx, err := db.Beginx()
			if err != nil {
				t.Fatal(err)
			}
			if _, err = tx.NamedExec(insert, sample); err != nil {
				tx.Rollback()
				t.Fatal("transaction:", err)
			}
			if err = tx.Commit(); err != nil {
				t.Fatal(err)
			}
			if _, err = db.NamedExec(insert, []record{sample, sample}); err != nil {
				t.Fatal("batch NamedExec:", err)
			}
			var records []record
			if err = db.Select(&records, `SELECT * FROM parameter_compatibility ORDER BY id`); err != nil {
				t.Fatal(err)
			}
			if len(records) != 5 {
				t.Fatalf("got %d rows, want 5", len(records))
			}
			for _, got := range records {
				for _, pair := range [][2][]byte{{got.Object, sample.Object}, {got.Items, sample.Items}} {
					var actual, expected interface{}
					if err = json.Unmarshal(pair[0], &actual); err != nil {
						t.Fatal(err)
					}
					if err = json.Unmarshal(pair[1], &expected); err != nil {
						t.Fatal(err)
					}
					if !reflect.DeepEqual(actual, expected) {
						t.Fatalf("JSON changed: %s", pair[0])
					}
				}
				if !bytes.Equal(got.Blob, sample.Blob) || got.OptionalKey == nil || !bytes.Equal(*got.OptionalKey, key) {
					t.Fatalf("binary data changed: %#v", got)
				}
				if !reflect.DeepEqual(got.Scopes, sample.Scopes) || got.Note != sample.Note {
					t.Fatalf("text/array changed: %#v", got)
				}
			}
			// Exercise the same JSON containment and bytea comparison shapes used by
			// credential searches and tree/path lookups.
			var count int
			err = db.Get(&count, `SELECT count(*) FROM parameter_compatibility
   WHERE object @> $1::jsonb AND blob=$2 AND $3=ANY(scopes)`, MythicJSONText(`{"nested":{"ok":true}}`), sample.Blob, "read")
			if err != nil || count != 5 {
				t.Fatalf("filter: count=%d error=%v", count, err)
			}
			var fields struct {
				Object   MythicJSONText  `db:"object"`
				Items    MythicJSONArray `db:"items"`
				BlobNull bool            `db:"blob_null"`
				KeyNull  bool            `db:"key_null"`
			}
			var nilBytes []byte
			var nilKey *[]byte
			err = db.Get(&fields, `INSERT INTO parameter_compatibility(object,items,blob,optional_key)
   VALUES($1,$2,$3,$4) RETURNING object,items,blob IS NULL AS blob_null,optional_key IS NULL AS key_null`, MythicJSONText(nil), MythicJSONArray(nil), nilBytes, nilKey)
			if err != nil {
				t.Fatal("defaults/null:", err)
			}
			if string(fields.Object) != "{}" || string(fields.Items) != "[]" || !fields.BlobNull || !fields.KeyNull {
				t.Fatalf("defaults/null changed: %#v", fields)
			}
			var empty bool
			if err = db.Get(&empty, `SELECT octet_length($1::bytea)=0`, []byte{}); err != nil || !empty {
				t.Fatalf("empty bytea: %v, %v", empty, err)
			}
			// This must still be an error. It demonstrates why JSON Valuers must use
			// strings when binary parameters are enabled.
			if mode == "yes" {
				var ignored interface{}
				if err = db.Get(&ignored, `SELECT $1::jsonb`, []byte(`{"raw":"json"}`)); err == nil {
					t.Fatal("raw JSON bytes unexpectedly accepted as binary jsonb")
				}
			}
			if err = db.Ping(); err != nil {
				t.Fatal("connection unusable after error:", err)
			}
			var number int
			if err = db.Get(&number, `SELECT $1::integer`, 42); err != nil || number != 42 {
				t.Fatalf("integer: %d, %v", number, err)
			}
			// Null scalar binding is independent of binary parameter encoding.
			var null sql.NullString
			if err = db.Get(&null, `SELECT $1::text`, sql.NullString{}); err != nil || null.Valid {
				t.Fatalf("NULL text: %#v, %v", null, err)
			}
		})
	}
}
