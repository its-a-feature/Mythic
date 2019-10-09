package structs

import (
	"log"
	"time"
)

//Message - struct definition for external C2 messages
type Message struct {
	Tag    string `json:"tag"`
	MType  int    `json:"mtype"`
	IDType int    `json:"idtype"`
	ID     string `json:"id"`
	Client bool `json:"client"`
	Data   string `json:"data"`
}

//ThreadMsg used to send task results back to the receiving channel
type ThreadMsg struct {
	TaskItem   Task
	TaskResult []byte
	SpecialResult []byte
	Error      bool
	Completed  bool
}

// Task used to define a task received from apfell
type Task struct {
	Command string `json:"command"`
	Params  string `json:"params"`
	ID      string `json:"id"`
	Job     *Job
}

// TaskStub to post list of currently processing tasks.
type TaskStub struct {
	Command string `json:"command"`
	Params  string `json:"params"`
	ID      string `json:"id"`
}

// Job struct that will listen for messages on the kill channel,
// set the Stop param to an exit code, and checks if it's in a
// monitoring state.
type Job struct {
	KillChannel chan (int)
	Stop        *int
	Monitoring  bool
}

// ClientResponse used to define a task response struct
type ClientResponse struct {
	Response string `json:"response"`
}

// CheckinResponse used to handle the checkin response from Apfell
type CheckinResponse struct {
	Status         string `json:"status"`
	Active         bool   `json:"active"`
	IntegrityLevel int    `json:"integrity_level"`
	InitCallback   string `json:"init_callback"`
	LastCheckin    string `json:"last_checkin"`
	User           string `json:"user"`
	OS             string `json:"os"`
	Arch           string `json:"architecture"`
	Domain         string `json:"domain"`
	Host           string `json:"host"`
	Pid            int    `json:"pid"`
	IP             string `json:"ip"`
	Description    string `json:"description"`
	Operator       string `json:"operator"`
	Payload        string `json:"registered_payload"`
	PayloadType    string `json:"payload_type"`
	C2profile      string `json:"c2_profile"`
	PCallback      string `json:"pcallback"`
	Operation      string `json:"operation"`
	ID             string `json:"id"`
}

// EKEInit used to initiate a key exchange with the apfell server
type EKEInit struct {
	SessionID string `json:"SESSIONID"`
	Pub       string `json:"PUB"`
}

// SessionKeyResponse used to handle the session key response from apfell
type SessionKeyResponse struct {
	Nonce         string `json:"nonce"`
	EncSessionKey string `json:"SESSIONKEY"`
}

// TaskResponse Used to define a task response
type TaskResponse struct {
	//Status     string                   `json:"status"`
	//Timestamp  string                   `json:"timestamp"`
	//Task       NestedApfellTaskResponse `json:"task"`
	Response   string                   `json:"response"`
	//ResponseID string                   `json:"id"`
	FileID     string                   `json:"file_id"`
}

// TaskMessage used to define a general message to Apfell
type TaskMessage struct {
    UserOutput string `json:"user_output"`
    Completed bool `json:"completed"`
    Status  string  `json:"status"`
}
//FileRegisterResponse used for holding the response after file registration
type FileRegisterResponse struct {
	Status string `json:"status"`
	FileID string `json:"file_id"`
}

// FileRegisterRequest used to register a file download
type FileRegisterRequest struct {
	Chunks int    `json:"total_chunks"`
	Task   string `json:"task"`
}

// FileChunk used to send a file download chunk to apfell
type FileChunk struct {
	ChunkNumber int    `json:"chunk_num"`
	ChunkData   string `json:"chunk_data"`
	FileID      string `json:"file_id"`
}

// FileChunkResponse used to handle the FileChunk response from Apfell
type FileChunkResponse struct {
	Status string `json:"status"`
}

//FileUploadParams - handle parameters for the file upload response
type FileUploadParams struct {
	FileID     string `json:"file_id"`
	RemotePath string `json:"remote_path"`
}

// CheckInStruct used for Checkin messages to Apfell
type CheckInStruct struct {
	User           string `json:"user"`
	Host           string `json:"host"`
	Pid            int    `json:"pid"`
	IP             string `json:"ip"`
	UUID           string `json:"uuid"`
	IntegrityLevel int    `json:"integrity_level"`
	OS             string `json:"os"`
	Arch           string `json:"architecture"`
	Domain         string `json:"domain"`
}

// MonitorStop tells the job that it needs to wait for a kill signal.
// The individual module is required to listen for the job.Stop
// variable to be > 0, and take requisite actions to tear-down.
func (j *Job) MonitorStop() {
	if !j.Monitoring {
		j.Monitoring = true
		for {
			select {
			case <-j.KillChannel:
				log.Println("Got kill message for job")
				*j.Stop = 1
				j.Monitoring = false
				return
			default:
				// …
				// log.Println("Sleeping in the kill chan...")
				time.Sleep(time.Second)
			}
		}
	}
}

// SendKill sends a kill message to the channel.
func (j *Job) SendKill() {
	j.KillChannel <- 1
}

// ToStub converts a Task item to a TaskStub that's easily
// transportable between client and server.
func (t *Task) ToStub() TaskStub {
	return TaskStub{
		Command: t.Command,
		ID:      t.ID,
		Params:  t.Params,
	}
}
