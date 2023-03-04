package databaseStructs

type Buildparameterinstance struct {
	ID               int            `db:"id"`
	BuildParameterID int            `db:"build_parameter_id"`
	BuildParameter   Buildparameter `db:"buildparameter"`
	PayloadID        int            `db:"payload_id"`
	Value            string         `db:"value"`
	EncKey           *[]byte        `db:"enc_key"`
	DecKey           *[]byte        `db:"dec_key"`
}
