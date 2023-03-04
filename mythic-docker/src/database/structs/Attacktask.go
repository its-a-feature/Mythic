package databaseStructs

type Attacktask struct {
	ID       int `db:"id"`
	AttackID int `db:"attack_id"`
	TaskID   int `db:"task_id"`
}
