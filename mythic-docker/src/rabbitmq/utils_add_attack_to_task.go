package rabbitmq

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func AddAttackToTask(tNum string, taskDisplayID int, operationID int) error {
	attack := databaseStructs.Attack{TNum: tNum}
	task := databaseStructs.Task{DisplayID: taskDisplayID}
	if err := database.DB.Get(&attack.ID, `SELECT id FROM attack WHERE t_num=$1`, attack.TNum); err != nil {
		logging.LogError(err, "Failed to find attack t_num")
		return err
	} else if err = database.DB.Get(&task.ID, `SELECT id FROM task WHERE display_id=$1 AND operation_id=$2`,
		task.DisplayID, operationID); err != nil {
		logging.LogError(err, "Failed to find task")
		return err
	} else if _, err := database.DB.Exec(`INSERT INTO attacktask (attack_id, task_id)
		VALUES ($1, $2)`, attack.ID, task.ID); err != nil {
		logging.LogError(err, "Failed to add attack to task")
		return err
	}
	return nil
}
