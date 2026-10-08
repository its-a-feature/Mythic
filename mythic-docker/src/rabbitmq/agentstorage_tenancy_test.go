package rabbitmq

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/its-a-feature/Mythic/database"
	"github.com/jmoiron/sqlx"
)

func TestAgentstorageCreateUsesAuthenticatedTenant(t *testing.T) {
	mock := installAgentstorageMock(t)
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO agentstorage
			(unique_id,data,operation_id,container_principal)
			VALUES (?, ?, ?, ?)`)).
		WithArgs("same-id", []byte("alpha"), 7, "alpha").
		WillReturnResult(sqlmock.NewResult(1, 1))

	response := MythicRPCAgentstorageCreate(MythicRPCAgentstorageCreateMessage{
		UniqueID: "same-id", DataToStore: []byte("alpha"),
	}, RabbitMQAuthContext{OperationID: 7, ContainerPrincipal: "alpha"})
	if !response.Success {
		t.Fatalf("tenant create failed: %s", response.Error)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestAgentstorageSearchUsesOperationAndPrincipalPredicates(t *testing.T) {
	mock := installAgentstorageMock(t)
	query := regexp.QuoteMeta(`SELECT
	*
	FROM agentstorage
	WHERE operation_id = $1
	  AND container_principal = $2
	  AND unique_id ILIKE $3`)
	mock.ExpectQuery(query).
		WithArgs(7, "alpha", "%same%").
		WillReturnRows(sqlmock.NewRows([]string{"id", "data", "unique_id", "operation_id", "container_principal"}).
			AddRow(1, []byte("owned"), "same-id", 7, "alpha"))

	response := MythicRPCAgentstorageSearch(MythicRPCAgentstorageSearchMessage{SearchUniqueID: "same"},
		RabbitMQAuthContext{OperationID: 7, ContainerPrincipal: "alpha"})
	if !response.Success || len(response.AgentStorageMessages) != 1 || string(response.AgentStorageMessages[0].Data) != "owned" {
		t.Fatalf("unexpected tenant search response: %#v", response)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestAgentstorageRemoveCannotDeleteAnotherTenant(t *testing.T) {
	mock := installAgentstorageMock(t)
	query := regexp.QuoteMeta(`DELETE FROM agentstorage
			WHERE unique_id=?
			  AND operation_id=?
			  AND container_principal=?`)
	mock.ExpectExec(query).
		WithArgs("same-id", 7, "alpha").
		WillReturnResult(sqlmock.NewResult(0, 0))

	response := MythicRPCAgentstorageRemove(MythicRPCAgentstorageRemoveMessage{UniqueID: "same-id"},
		RabbitMQAuthContext{OperationID: 7, ContainerPrincipal: "alpha"})
	if response.Success || response.Error == "" {
		t.Fatalf("cross-tenant/missing remove should fail: %#v", response)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func installAgentstorageMock(t *testing.T) sqlmock.Sqlmock {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	previous := database.DB
	database.DB = sqlx.NewDb(db, "sqlmock")
	t.Cleanup(func() {
		database.DB.Close()
		database.DB = previous
	})
	return mock
}
