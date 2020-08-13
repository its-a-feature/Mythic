package servers

// C2Config - struct for server configuration
type C2Config struct {
	BindAddress   string `json:"bindaddress"`
	SocketURI     string `json:"websocketuri"`
	SSLKey        string `json:"sslkey"`
	SSLCert       string `json:"sslcert"`
	UseSSL        bool   `json:"usessl"`
	Defaultpage   string `json:"defaultpage"`
	Logfile       string `json:"logfile"`
	Debug         bool   `json:"debug"`
}

//Server - interface used for all c2 profiles
type Server interface {
	ApfellBaseURL() string
	SetApfellBaseURL(url string)
	PostResponse(taskid string, output []byte) []byte
	PostMessage(msg []byte) []byte
	GetNextTask(apfellID string) []byte
	Run(cf interface{})
}

//Message - struct definition for messages between clients and the server
type Message struct {
	Tag    string `json:"tag"`
	Client bool   `json:"client"`
	Data   string `json:"data"`
}

func NewInstance() interface{} {
	return newServer()
}
