package databaseStructs

type Callbackc2profiles struct {
	ID          int       `db:"id"`
	CallbackID  int       `db:"callback_id"`
	C2ProfileID int       `db:"c2_profile_id"`
	C2Profile   C2profile `db:"c2profile"`
}
