package databaseStructs

type Payloadc2profiles struct {
	ID          int       `db:"id"`
	PayloadID   int       `db:"payload_id"`
	C2ProfileID int       `db:"c2_profile_id"`
	C2profile   C2profile `db:"c2profile"`
}
