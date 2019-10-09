package getuser

import (
	"encoding/json"
	"os/user"

	"pkg/utils/structs"
)

type SerializableUser struct {
	// Uid is the user ID.
	// On POSIX systems, this is a decimal number representing the uid.
	// On Windows, this is a security identifier (SID) in a string format.
	// On Plan 9, this is the contents of /dev/user.
	Uid string `json:"uid"`
	// Gid is the primary group ID.
	// On POSIX systems, this is a decimal number representing the gid.
	// On Windows, this is a SID in a string format.
	// On Plan 9, this is the contents of /dev/user.
	Gid string `json:"gid"`
	// Username is the login name.
	Username string `json:"username"`
	// Name is the user's real or display name.
	// It might be blank.
	// On POSIX systems, this is the first (or only) entry in the GECOS field
	// list.
	// On Windows, this is the user's display name.
	// On Plan 9, this is the contents of /dev/user.
	Name string `json:"name"`
	// HomeDir is the path to the user's home directory (if they have one).
	HomeDir string `json:"homedir"`
}

//Run - Function that executes the shell command
func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	tMsg.Error = false
	tMsg.TaskItem = task

	curUser, err := user.Current()

	if err != nil {
		tMsg.Error = true
		tMsg.TaskResult = []byte(err.Error())
		threadChannel <- tMsg
		return
	}

	serUser := SerializableUser{
		Uid:      curUser.Uid,
		Gid:      curUser.Gid,
		Username: curUser.Username,
		Name:     curUser.Name,
		HomeDir:  curUser.HomeDir,
	}

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	res, err := json.MarshalIndent(serUser, "", "    ")

	if err != nil {
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
    tMsg.Completed = true
	tMsg.TaskResult = res
	threadChannel <- tMsg
}
