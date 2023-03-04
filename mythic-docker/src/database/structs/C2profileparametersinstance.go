package databaseStructs

import (
	"database/sql"
)

type C2profileparametersinstance struct {
	ID                    int                 `db:"id"`
	C2ProfileParametersID int                 `db:"c2_profile_parameters_id"`
	C2ProfileParameter    C2profileparameters `db:"c2profileparameters"`
	C2ProfileID           int                 `db:"c2_profile_id"`
	C2Profile             C2profile           `db:"c2profile"`
	Value                 string              `db:"value"`
	EncKey                *[]byte             `db:"enc_key"`
	DecKey                *[]byte             `db:"dec_key"`
	PayloadID             sql.NullInt64       `db:"payload_id"`
	InstanceName          sql.NullString      `db:"instance_name"`
	OperationID           sql.NullInt64       `db:"operation_id"`
	CallbackID            sql.NullInt64       `db:"callback_id"`
}
