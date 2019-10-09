package kill

import (
	"fmt"
	"os"
	"strconv"
	"syscall"

	"pkg/utils/structs"
)

//Run - Function that executes the shell command
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	tMsg.TaskItem = task

	pid, err := strconv.Atoi(task.Params)

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	p, err := os.FindProcess(pid)

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	p.Signal(syscall.SIGKILL)

	tMsg.TaskResult = []byte(fmt.Sprintf("Killed process with PID %s", task.Params))
	threadChannel <- tMsg
}
