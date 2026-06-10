package databaseStructs

import "database/sql"

type Buildparameterinstance struct {
	ID               int            `db:"id"`
	BuildParameterID int            `db:"build_parameter_id"`
	BuildParameter   Buildparameter `db:"buildparameter"`
	PayloadID        sql.NullInt64  `db:"payload_id"`
	Value            string         `db:"value"`
	EncKey           *[]byte        `db:"enc_key"`
	DecKey           *[]byte        `db:"dec_key"`
	InstanceName     sql.NullString `db:"instance_name"`
	OperationID      sql.NullInt64  `db:"operation_id"`
}
