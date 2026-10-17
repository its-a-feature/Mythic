package rabbitmq

import (
	"database/sql"
	"regexp"
	"testing"
)

func TestFileBrowserCreateUsesAuthenticatedOperationID(t *testing.T) {
	mock := installAgentstorageMock(t)
	mock.ExpectQuery(regexp.QuoteMeta("WHERE task.id = $1 AND task.operation_id=$2")).
		WithArgs(42, 7).
		WillReturnError(sql.ErrNoRows)

	response := MythicRPCFileBrowserCreate(MythicRPCFileBrowserCreateMessage{TaskID: 42},
		RabbitMQAuthContext{OperationID: 7, ContainerPrincipal: "alpha"})
	if response.Success {
		t.Fatal("missing task unexpectedly produced a successful file-browser response")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
