package rm

import (
	"fmt"
	"os"

	"pkg/utils/structs"
)

//Run - interface method that retrieves a process list
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	tMsg.TaskItem = task

	if _, err := os.Stat(task.Params); os.IsNotExist(err) {
		tMsg.TaskResult = []byte(fmt.Sprintf("File '%s' does not exist.", task.Params))
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	err := os.Remove(task.Params)
	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
    tMsg.Completed = true
	tMsg.TaskResult = []byte(fmt.Sprintf("Deleted %s", task.Params))
	threadChannel <- tMsg
}
