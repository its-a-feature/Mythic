package cp

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"pkg/utils/structs"
)

type Arguments struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
}

func copy(src, dst string) (int64, error) {
	sourceFileStat, err := os.Stat(src)
	if err != nil {
		return 0, err
	}

	if !sourceFileStat.Mode().IsRegular() {
		return 0, fmt.Errorf("%s is not a regular file", src)
	}

	source, err := os.Open(src)
	if err != nil {
		return 0, err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return 0, err
	}
	defer destination.Close()
	nBytes, err := io.Copy(destination, source)
	return nBytes, err
}

//Run - Function that executes the shell command
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.TaskItem = task
	args := &Arguments{}
	err := json.Unmarshal([]byte(task.Params), args)
	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	copiedBytes, err := copy(args.Source, args.Destination)

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	tMsg.TaskResult = []byte(fmt.Sprintf("Copied %d bytes to %s", copiedBytes, args.Destination))
	tMsg.Error = false
	tMsg.Completed = true
	threadChannel <- tMsg
}
