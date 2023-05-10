package databaseStructs

type Attack struct {
	ID     int    `db:"id"`
	TNum   string `db:"t_num"`
	Name   string `db:"name"`
	Os     string `db:"os"`
	Tactic string `db:"tactic"`
}
