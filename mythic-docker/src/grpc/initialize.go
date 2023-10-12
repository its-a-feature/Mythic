package grpc

import (
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"google.golang.org/grpc"
	"math"
	"net"
	"sync"
	"time"
)

const (
	connectionTimeoutSeconds  = 3
	channelSendTimeoutSeconds = 1
)

type translationContainerServer struct {
	services.UnimplementedTranslationContainerServer
	sync.RWMutex
	clients            map[string]*grpcTranslationContainerClientConnections
	connectionTimeout  time.Duration
	channelSendTimeout time.Duration
	listening          bool
	latestError        string
}
type pushC2Server struct {
	services.UnimplementedPushC2Server
	sync.RWMutex
	clients                     map[int]*grpcPushC2ClientConnections
	connectionTimeout           time.Duration
	channelSendTimeout          time.Duration
	rabbitmqProcessAgentMessage chan RabbitMQProcessAgentMessageFromPushC2
	listening                   bool
	latestError                 string
}

type grpcTranslationContainerClientConnections struct {
	generateKeysMessage                          chan services.TrGenerateEncryptionKeysMessage
	generateKeysMessageResponse                  chan services.TrGenerateEncryptionKeysMessageResponse
	translateCustomToMythicFormatMessage         chan services.TrCustomMessageToMythicC2FormatMessage
	translateCustomToMythicFormatMessageResponse chan services.TrCustomMessageToMythicC2FormatMessageResponse
	translateMythicToCustomFormatMessage         chan services.TrMythicC2ToCustomMessageFormatMessage
	translateMythicToCustomFormatMessageResponse chan services.TrMythicC2ToCustomMessageFormatMessageResponse
	connectedGenerateKeys                        bool
	connectedCustomToMythic                      bool
	connectedMythicToCustom                      bool
	sync.RWMutex
}
type grpcPushC2ClientConnections struct {
	pushC2MessageFromMythic chan services.PushC2MessageFromMythic
	connected               bool
	callbackUUID            string
	base64Encoded           bool
	c2ProfileName           string
	sync.RWMutex
}

var TranslationContainerServer translationContainerServer
var PushC2Server pushC2Server

func (t *translationContainerServer) addNewGenerateKeysClient(translationContainerName string) (chan services.TrGenerateEncryptionKeysMessage, chan services.TrGenerateEncryptionKeysMessageResponse, error) {
	t.Lock()
	if _, ok := t.clients[translationContainerName]; !ok {
		t.clients[translationContainerName] = &grpcTranslationContainerClientConnections{}
		t.clients[translationContainerName].generateKeysMessage = make(chan services.TrGenerateEncryptionKeysMessage)
		t.clients[translationContainerName].generateKeysMessageResponse = make(chan services.TrGenerateEncryptionKeysMessageResponse)
		t.clients[translationContainerName].translateCustomToMythicFormatMessage = make(chan services.TrCustomMessageToMythicC2FormatMessage)
		t.clients[translationContainerName].translateCustomToMythicFormatMessageResponse = make(chan services.TrCustomMessageToMythicC2FormatMessageResponse)
		t.clients[translationContainerName].translateMythicToCustomFormatMessage = make(chan services.TrMythicC2ToCustomMessageFormatMessage)
		t.clients[translationContainerName].translateMythicToCustomFormatMessageResponse = make(chan services.TrMythicC2ToCustomMessageFormatMessageResponse)
	}
	msg := t.clients[translationContainerName].generateKeysMessage
	rsp := t.clients[translationContainerName].generateKeysMessageResponse
	t.clients[translationContainerName].connectedGenerateKeys = true
	t.Unlock()
	return msg, rsp, nil
}
func (t *translationContainerServer) addNewCustomToMythicClient(translationContainerName string) (chan services.TrCustomMessageToMythicC2FormatMessage, chan services.TrCustomMessageToMythicC2FormatMessageResponse, error) {
	t.Lock()
	if _, ok := t.clients[translationContainerName]; !ok {
		t.clients[translationContainerName] = &grpcTranslationContainerClientConnections{}
		t.clients[translationContainerName].generateKeysMessage = make(chan services.TrGenerateEncryptionKeysMessage)
		t.clients[translationContainerName].generateKeysMessageResponse = make(chan services.TrGenerateEncryptionKeysMessageResponse)
		t.clients[translationContainerName].translateCustomToMythicFormatMessage = make(chan services.TrCustomMessageToMythicC2FormatMessage)
		t.clients[translationContainerName].translateCustomToMythicFormatMessageResponse = make(chan services.TrCustomMessageToMythicC2FormatMessageResponse)
		t.clients[translationContainerName].translateMythicToCustomFormatMessage = make(chan services.TrMythicC2ToCustomMessageFormatMessage)
		t.clients[translationContainerName].translateMythicToCustomFormatMessageResponse = make(chan services.TrMythicC2ToCustomMessageFormatMessageResponse)
	}
	msg := t.clients[translationContainerName].translateCustomToMythicFormatMessage
	rsp := t.clients[translationContainerName].translateCustomToMythicFormatMessageResponse
	t.clients[translationContainerName].connectedCustomToMythic = true
	t.Unlock()
	return msg, rsp, nil
}
func (t *translationContainerServer) addNewMythicToCustomClient(translationContainerName string) (chan services.TrMythicC2ToCustomMessageFormatMessage, chan services.TrMythicC2ToCustomMessageFormatMessageResponse, error) {
	t.Lock()
	if _, ok := t.clients[translationContainerName]; !ok {
		t.clients[translationContainerName] = &grpcTranslationContainerClientConnections{}
		t.clients[translationContainerName].generateKeysMessage = make(chan services.TrGenerateEncryptionKeysMessage)
		t.clients[translationContainerName].generateKeysMessageResponse = make(chan services.TrGenerateEncryptionKeysMessageResponse)
		t.clients[translationContainerName].translateCustomToMythicFormatMessage = make(chan services.TrCustomMessageToMythicC2FormatMessage)
		t.clients[translationContainerName].translateCustomToMythicFormatMessageResponse = make(chan services.TrCustomMessageToMythicC2FormatMessageResponse)
		t.clients[translationContainerName].translateMythicToCustomFormatMessage = make(chan services.TrMythicC2ToCustomMessageFormatMessage)
		t.clients[translationContainerName].translateMythicToCustomFormatMessageResponse = make(chan services.TrMythicC2ToCustomMessageFormatMessageResponse)
	}
	msg := t.clients[translationContainerName].translateMythicToCustomFormatMessage
	rsp := t.clients[translationContainerName].translateMythicToCustomFormatMessageResponse
	t.clients[translationContainerName].connectedMythicToCustom = true
	t.Unlock()
	return msg, rsp, nil
}
func (t *translationContainerServer) GetGenerateKeysChannels(translationContainerName string) (chan services.TrGenerateEncryptionKeysMessage, chan services.TrGenerateEncryptionKeysMessageResponse, error) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[translationContainerName]; ok {
		return t.clients[translationContainerName].generateKeysMessage,
			t.clients[translationContainerName].generateKeysMessageResponse,
			nil
	}
	return nil, nil, errors.New("no translation container by that name currently connected")
}
func (t *translationContainerServer) SetGenerateKeysChannelExited(translationContainerName string) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedGenerateKeys = false
	}
}
func (t *translationContainerServer) GetCustomToMythicChannels(translationContainerName string) (chan services.TrCustomMessageToMythicC2FormatMessage, chan services.TrCustomMessageToMythicC2FormatMessageResponse, error) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[translationContainerName]; ok {
		return t.clients[translationContainerName].translateCustomToMythicFormatMessage,
			t.clients[translationContainerName].translateCustomToMythicFormatMessageResponse,
			nil
	}
	return nil, nil, errors.New("no translation container by that name currently connected")
}
func (t *translationContainerServer) SetCustomToMythicChannelExited(translationContainerName string) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedCustomToMythic = false
	}
}
func (t *translationContainerServer) GetMythicToCustomChannels(translationContainerName string) (chan services.TrMythicC2ToCustomMessageFormatMessage, chan services.TrMythicC2ToCustomMessageFormatMessageResponse, error) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[translationContainerName]; ok {
		return t.clients[translationContainerName].translateMythicToCustomFormatMessage,
			t.clients[translationContainerName].translateMythicToCustomFormatMessageResponse,
			nil
	}
	return nil, nil, errors.New("no translation container by that name currently connected")
}
func (t *translationContainerServer) SetMythicToCustomChannelExited(translationContainerName string) {
	t.RLock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedMythicToCustom = false
	}
	t.RUnlock()
}
func (t *translationContainerServer) CheckClientConnected(translationContainerName string) bool {
	t.RLock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.RUnlock()
		return t.clients[translationContainerName].connectedMythicToCustom &&
			t.clients[translationContainerName].connectedGenerateKeys &&
			t.clients[translationContainerName].connectedCustomToMythic
	} else {
		t.RUnlock()
		return false
	}
}
func (t *translationContainerServer) CheckListening() (listening bool, latestError string) {
	return t.listening, t.latestError
}
func (t *translationContainerServer) GetTimeout() time.Duration {
	return t.connectionTimeout
}
func (t *translationContainerServer) GetChannelTimeout() time.Duration {
	return t.channelSendTimeout
}

func (t *pushC2Server) GetRabbitMqProcessAgentMessageChannel() chan RabbitMQProcessAgentMessageFromPushC2 {
	return t.rabbitmqProcessAgentMessage
}
func (t *pushC2Server) addNewPushC2Client(CallbackAgentID int, callbackUUID string, base64Encoded bool, c2ProfileName string) (chan services.PushC2MessageFromMythic, error) {
	t.Lock()
	if _, ok := t.clients[CallbackAgentID]; !ok {
		t.clients[CallbackAgentID] = &grpcPushC2ClientConnections{}
		t.clients[CallbackAgentID].pushC2MessageFromMythic = make(chan services.PushC2MessageFromMythic, 100)
	}
	fromMythic := t.clients[CallbackAgentID].pushC2MessageFromMythic
	t.clients[CallbackAgentID].connected = true
	t.clients[CallbackAgentID].callbackUUID = callbackUUID
	t.clients[CallbackAgentID].base64Encoded = base64Encoded
	t.clients[CallbackAgentID].c2ProfileName = c2ProfileName
	t.Unlock()
	return fromMythic, nil
}
func (t *pushC2Server) GetPushC2ClientInfo(CallbackAgentID int) (chan services.PushC2MessageFromMythic, string, bool, string, error) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[CallbackAgentID]; ok {
		if t.clients[CallbackAgentID].connected {
			return t.clients[CallbackAgentID].pushC2MessageFromMythic,
				t.clients[CallbackAgentID].callbackUUID,
				t.clients[CallbackAgentID].base64Encoded,
				t.clients[CallbackAgentID].c2ProfileName,
				nil
		} else {
			return nil, "", false, "", errors.New("push c2 channel for that callback is no longer available")
		}

	}
	return nil, "", false, "", errors.New("no push c2 channel for that callback available")
}
func (t *pushC2Server) SetPushC2ChannelExited(CallbackAgentID int) {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[CallbackAgentID]; ok {
		t.clients[CallbackAgentID].connected = false
	}
}
func (t *pushC2Server) CheckListening() (listening bool, latestError string) {
	return t.listening, t.latestError
}
func (t *pushC2Server) CheckClientConnected(CallbackAgentID int) bool {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[CallbackAgentID]; ok {
		return t.clients[CallbackAgentID].connected
	} else {
		return false
	}
}
func (t *pushC2Server) GetConnectedClients() []int {
	clientIDs := []int{}
	t.RLock()
	defer t.RUnlock()
	for clientID, _ := range t.clients {
		if t.clients[clientID].connected {
			clientIDs = append(clientIDs, clientID)
		}
	}
	return clientIDs
}
func (t *pushC2Server) GetTimeout() time.Duration {
	return t.connectionTimeout
}
func (t *pushC2Server) GetChannelTimeout() time.Duration {
	return t.channelSendTimeout
}

func Initialize() {
	// need to open a port to accept gRPC connections
	var (
		connectString string
	)
	// initialize the clients
	TranslationContainerServer.clients = make(map[string]*grpcTranslationContainerClientConnections)
	TranslationContainerServer.connectionTimeout = connectionTimeoutSeconds * time.Second
	TranslationContainerServer.channelSendTimeout = channelSendTimeoutSeconds * time.Second
	// initial for push c2 servers
	PushC2Server.clients = make(map[int]*grpcPushC2ClientConnections)
	PushC2Server.rabbitmqProcessAgentMessage = make(chan RabbitMQProcessAgentMessageFromPushC2, 20)
	PushC2Server.connectionTimeout = connectionTimeoutSeconds * time.Second
	PushC2Server.channelSendTimeout = channelSendTimeoutSeconds * time.Second
	connectString = fmt.Sprintf("0.0.0.0:%d", utils.MythicConfig.ServerGRPCPort)
	go serveGRPCInBackground(connectString)

}
func serveGRPCInBackground(connectString string) {
	grpcServer := grpc.NewServer(grpc.MaxSendMsgSize(math.MaxInt), grpc.MaxRecvMsgSize(math.MaxInt))
	services.RegisterTranslationContainerServer(grpcServer, &TranslationContainerServer)
	services.RegisterPushC2Server(grpcServer, &PushC2Server)
	logging.LogInfo("Initializing grpc connections...")
	for {
		TranslationContainerServer.listening = false
		PushC2Server.listening = false
		if listen, err := net.Listen("tcp", connectString); err != nil {
			logging.LogError(err, "Failed to open port for gRPC connections, retrying...")
			TranslationContainerServer.latestError = err.Error()
			PushC2Server.latestError = err.Error()
			time.Sleep(TranslationContainerServer.GetTimeout())
			continue
		} else {
			TranslationContainerServer.listening = true
			PushC2Server.listening = true
			TranslationContainerServer.latestError = ""
			PushC2Server.latestError = ""
			// create a new instance of a grpc server
			logging.LogInfo("gRPC Initialized", "connection", connectString)
			// tie the Servers to our new grpc server and our server struct
			// use the TCP port in listen to process requests for the grpc server translationContainerGRPCServer
			if err = grpcServer.Serve(listen); err != nil {
				logging.LogError(err, "Failed to listen for gRPC connections")
				TranslationContainerServer.latestError = err.Error()
			}
		}
	}
}
