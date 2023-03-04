package databaseStructs

type Payloadtypec2profile struct {
	ID            int `db:"id"`
	PayloadTypeID int `db:"payload_type_id"`
	Payloadtype   `db:"payloadtype"`
	C2ProfileID   int `db:"c2_profile_id"`
	C2profile     `db:"c2profile"`
}
