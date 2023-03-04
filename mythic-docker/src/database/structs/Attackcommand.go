package databaseStructs

type Attackcommand struct {
	ID        int `db:"id"`
	AttackID  int `db:"attack_id"`
	Attack    `db:"attack"`
	CommandID int `db:"command_id"`
	Command   `db:"command"`
}
