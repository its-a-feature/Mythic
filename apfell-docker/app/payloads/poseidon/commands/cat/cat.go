package cat
 
import (
	"os"
	"pkg/utils/structs"
)

//Run - package function to run cat
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	f, err := os.Open(task.Params)

	tMsg.TaskItem = task
	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	info, err := f.Stat()

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	data := make([]byte, int(info.Size()))
	n, err := f.Read(data)
	if err != nil && n == 0 {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
    tMsg.Completed = true
    if len(data) == 0{
        tMsg.TaskResult = []byte("[*] File is empty")
    }else{
        tMsg.TaskResult = data
    }

	threadChannel <- tMsg
}
