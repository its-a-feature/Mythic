package databaseStructs

type Attacktask struct {
	ID       int    `db:"id"`
	Attack   Attack `db:"attack"`
	AttackID int    `db:"attack_id"`
	Task     Task   `db:"task"`
	TaskID   int    `db:"task_id"`
}
