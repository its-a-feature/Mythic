package setenv

import (
	"fmt"
	"os"
	"strings"

	"pkg/utils/structs"
)

//Run - Function that executes the shell command
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.TaskItem = task
	tMsg.Error = false
	parts := strings.SplitAfterN(task.Params, " ", 2)
	parts[0] = strings.TrimSpace(parts[0])
	parts[1] = strings.TrimSpace(parts[1])
	if len(parts) != 2 {
		tMsg.Error = true
		tMsg.TaskResult = []byte("Not enough parameters.")
		threadChannel <- tMsg
		return
	}
	err := os.Setenv(parts[0], parts[1])
	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}
	tMsg.Completed = true
	tMsg.TaskResult = []byte(fmt.Sprintf("Set %s=%s", parts[0], parts[1]))
	threadChannel <- tMsg
}
