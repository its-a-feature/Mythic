package mkdir

import (
	"fmt"
	"os"

	"pkg/utils/structs"
)

func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	tMsg.TaskItem = task

	err := os.Mkdir(task.Params, 0777)
	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
    tMsg.Completed = true
	tMsg.TaskResult = []byte(fmt.Sprintf("Created directory: %s", task.Params))
	threadChannel <- tMsg
}
