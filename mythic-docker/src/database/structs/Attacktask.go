package databaseStructs

type Attacktask struct {
	ID       int    `db:"id"`
	Attack   Attack `db:"attack"`
	AttackID int    `db:"attack_id"`
	TaskID   int    `db:"task_id"`
}
