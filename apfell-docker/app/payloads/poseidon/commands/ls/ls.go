package ls

import (
	"encoding/json"
	"io/ioutil"

	"pkg/utils/structs"
)

type DirectoryEntries struct {
	Entries []FileData `json:"entries"`
}

type FileData struct {
	Filename     string `json:"Filename"`
	FileSize     int64  `json:"Size"`
	LastModified string `json:"Lastmodified"`
	Directory    bool   `json:"IsDir"`
	Permissions  string `json:"Permissions"`
}

func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	if len(task.Params) == 0 {
		task.Params = "."
	}
	files, err := ioutil.ReadDir(task.Params)

	tMsg.TaskItem = task
	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	fileEntries := make([]FileData, len(files))

	for i := 0; i < len(files); i++ {
		fileEntries[i].Filename = files[i].Name()
		fileEntries[i].Directory = files[i].IsDir()
		fileEntries[i].FileSize = files[i].Size()
		fileEntries[i].LastModified = files[i].ModTime().String()
		fileEntries[i].Permissions = files[i].Mode().Perm().String()
	}

	var e DirectoryEntries
	e.Entries = fileEntries

	data, err := json.MarshalIndent(e, "", "	")

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
    tMsg.Completed = true
	tMsg.TaskResult = data
	threadChannel <- tMsg
}
