package rabbitmq

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func addMitreAttackTaskMapping(taskId int) {
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
		command_id
		FROM task
		WHERE id=$1`, taskId); err != nil {
		logging.LogError(err, "Failed to fetch command data for task", "task_id", taskId)
	} else {
		mappedIDs := []databaseStructs.Attackcommand{}
		if err := database.DB.Select(&mappedIDs, `SELECT
			* 
			FROM attackcommand
			WHERE command_id=$1`, task.CommandID); err != nil {
			logging.LogError(err, "Failed to fetch MITRE ATT&CK mappings for command")
		} else {
			for _, mapping := range mappedIDs {
				if _, err = database.DB.Exec(`INSERT INTO attacktask
					(attack_id, task_id) VALUES ($1, $2)`, mapping.AttackID, taskId); err != nil {
					logging.LogError(err, "Failed to add attacking mapping")
				}
			}
		}
	}
}
