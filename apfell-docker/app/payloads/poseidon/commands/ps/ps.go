package ps

import (
	"encoding/json"

	"pkg/utils/structs"
)

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
}

//ProcessArray - struct that will hold all of the Process results
type ProcessArray struct {
	Results []ProcessDetails `json:"Processes"`
}

type ProcessDetails struct {
	ProcessID       int    `json:"process_id"`
	ParentProcessID int    `json:"parent_process_id"`
	Arch            string `json:"architecture"`
	Path            string `json:"name"`
	User            string `json:"user"`
	BinPath		string `json:"bin_path"`
}

//Run - interface method that retrieves a process list
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	procs, err := processes()
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	tMsg.TaskItem = task
	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	p := make([]ProcessDetails, len(procs))

	// Loop over the process results and add them to the json object array
	for index := 0; index < len(procs); index++ {
		p[index].Arch = procs[index].Arch()
		p[index].ProcessID = procs[index].Pid()
		p[index].ParentProcessID = procs[index].PPid()
		p[index].User = procs[index].Owner()
		p[index].Path = procs[index].Executable()
		p[index].BinPath = procs[index].BinPath()
	}

	var pa ProcessArray
	pa.Results = p
	jsonProcs, er := json.MarshalIndent(p, "", "	")

	if er != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(er.Error())
		threadChannel <- tMsg
		return
	}
    tMsg.Completed = true
	tMsg.TaskResult = jsonProcs
	threadChannel <- tMsg
}
