package grpc

import (
	"errors"
	"fmt"
	"math"
	"net"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/database/enums/PushC2Connections"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"google.golang.org/grpc"
)

const (
	connectionTimeoutSeconds  = 10
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
type PushC2ServerConnected struct {
	PushC2MessagesToMythic   chan RabbitMQProcessAgentMessageFromPushC2
	DisconnectProcessingChan chan bool
}
type pushC2Server struct {
	services.UnimplementedPushC2Server
	sync.RWMutex
	clients                              map[int]*grpcPushC2ClientConnections
	clientsOneToMany                     map[string]*grpcPushC2ClientConnections
	connectionTimeout                    time.Duration
	channelSendTimeout                   time.Duration
	rabbitmqProcessPushC2AgentConnection chan PushC2ServerConnected
	listening                            bool
	latestError                          string
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
	connections             int
	callbackUUID            string
	base64Encoded           bool
	c2ProfileName           string
	AgentUUIDSize           int
	sync.RWMutex
}

var TranslationContainerServer translationContainerServer
var PushC2Server pushC2Server

// translationContainerServer functions
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
	return nil, nil, errors.New(fmt.Sprintf("no translation container \"%s\" currently connected", translationContainerName))
}
func (t *translationContainerServer) SetGenerateKeysChannelExited(translationContainerName string) {
	t.Lock()
	defer t.Unlock()
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
	return nil, nil, errors.New(fmt.Sprintf("no translation container \"%s\" currently connected", translationContainerName))
}
func (t *translationContainerServer) SetCustomToMythicChannelExited(translationContainerName string) {
	t.Lock()
	defer t.Unlock()
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
	return nil, nil, errors.New(fmt.Sprintf("no translation container \"%s\" currently connected", translationContainerName))
}
func (t *translationContainerServer) SetMythicToCustomChannelExited(translationContainerName string) {
	t.Lock()
	defer t.Unlock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedMythicToCustom = false
	}
}
func (t *translationContainerServer) CheckClientConnected(translationContainerName string) bool {
	t.RLock()
	defer t.Unlock()
	if _, ok := t.clients[translationContainerName]; ok {
		connected := t.clients[translationContainerName].connectedMythicToCustom &&
			t.clients[translationContainerName].connectedGenerateKeys &&
			t.clients[translationContainerName].connectedCustomToMythic
		return connected
	}
	return false
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

// pushC2Server functions
func (t *pushC2Server) GetRabbitMqProcessAgentMessageChannel() chan PushC2ServerConnected {
	return t.rabbitmqProcessPushC2AgentConnection
}
func (t *pushC2Server) addNewPushC2Client(CallbackID int, callbackUUID string, base64Encoded bool, c2ProfileName string, agentUUIDSize int) (chan services.PushC2MessageFromMythic, error) {
	t.Lock()
	if _, ok := t.clients[CallbackID]; !ok {
		t.clients[CallbackID] = &grpcPushC2ClientConnections{}
		t.clients[CallbackID].pushC2MessageFromMythic = make(chan services.PushC2MessageFromMythic, 2000)
	}
	fromMythic := t.clients[CallbackID].pushC2MessageFromMythic
	t.clients[CallbackID].connected = true
	t.clients[CallbackID].connections += 1
	t.clients[CallbackID].callbackUUID = callbackUUID
	t.clients[CallbackID].base64Encoded = base64Encoded
	t.clients[CallbackID].c2ProfileName = c2ProfileName
	t.clients[CallbackID].AgentUUIDSize = agentUUIDSize
	t.Unlock()
	return fromMythic, nil
}
func (t *pushC2Server) addNewPushC2OneToManyClient(c2ProfileName string) (chan services.PushC2MessageFromMythic, error) {
	t.Lock()
	if _, ok := t.clientsOneToMany[c2ProfileName]; !ok {
		t.clientsOneToMany[c2ProfileName] = &grpcPushC2ClientConnections{}
		t.clientsOneToMany[c2ProfileName].pushC2MessageFromMythic = make(chan services.PushC2MessageFromMythic, 1000)
	}
	fromMythic := t.clientsOneToMany[c2ProfileName].pushC2MessageFromMythic
	t.clientsOneToMany[c2ProfileName].connected = true
	t.clientsOneToMany[c2ProfileName].c2ProfileName = c2ProfileName
	t.Unlock()
	return fromMythic, nil
}
func (t *pushC2Server) GetPushC2ClientInfo(CallbackID int) (chan services.PushC2MessageFromMythic, string, bool, string, string, int, error) {
	t.RLock()
	if client, ok := t.clients[CallbackID]; ok {
		if client.connected {
			pushC2MessageFromMythic := client.pushC2MessageFromMythic
			callbackUUID := client.callbackUUID
			base64Encoded := client.base64Encoded
			c2ProfileName := client.c2ProfileName
			agentUUIDSize := client.AgentUUIDSize
			t.RUnlock()
			return pushC2MessageFromMythic,
				callbackUUID,
				base64Encoded,
				c2ProfileName,
				callbackUUID,
				agentUUIDSize,
				nil
		}
		t.RUnlock()
		return nil, "", false, "", "", 0, errors.New("push c2 channel for that callback is no longer available")
	}
	for c2, client := range t.clientsOneToMany {
		c2ProfileToCallbackIDsMapLock.RLock()
		if callbackInfoMap, ok := c2ProfileToCallbackIDsMap[c2]; ok {
			if callbackInfo, ok := callbackInfoMap[CallbackID]; ok {
				pushC2MessageFromMythic := client.pushC2MessageFromMythic
				callbackUUID := callbackInfo.CallbackUUID
				base64Encoded := callbackInfo.Base64Encoded
				trackingID := callbackInfo.TrackingID
				agentUUIDSize := callbackInfo.AgentUUIDSize
				c2ProfileToCallbackIDsMapLock.RUnlock()
				t.RUnlock()
				return pushC2MessageFromMythic,
					callbackUUID,
					base64Encoded,
					c2,
					trackingID,
					agentUUIDSize,
					nil
			}
		}
		c2ProfileToCallbackIDsMapLock.RUnlock()
	}
	t.RUnlock()
	return nil, "", false, "", "", 0, errors.New("no push c2 channel for that callback available")
}
func (t *pushC2Server) SetPushC2ChannelExited(CallbackID int) {
	t.Lock()
	if _, ok := t.clients[CallbackID]; ok {
		t.clients[CallbackID].connections -= 1
		if t.clients[CallbackID].connections <= 0 {
			t.clients[CallbackID].connections = 0
			t.clients[CallbackID].connected = false
			c2ProfileName := t.clients[CallbackID].c2ProfileName
			t.Unlock()
			go updatePushC2LastCheckinDisconnectTimestamp(CallbackID, c2ProfileName)
			return
		}
	}
	t.Unlock()
}
func (t *pushC2Server) SetPushC2OneToManyChannelExited(c2ProfileName string) {
	t.Lock()
	defer t.Unlock()
	if _, ok := t.clientsOneToMany[c2ProfileName]; ok {
		t.clientsOneToMany[c2ProfileName].connected = false
	}
}
func (t *pushC2Server) CheckListening() (listening bool, latestError string) {
	return t.listening, t.latestError
}

func (t *pushC2Server) CheckClientConnected(CallbackAgentID int) PushC2Connections.ConnectionType {
	t.RLock()
	defer t.RUnlock()
	if _, ok := t.clients[CallbackAgentID]; ok {
		if t.clients[CallbackAgentID].connected {
			return PushC2Connections.ConnectedOneToOne
		}
		return PushC2Connections.DisconnectedOneToOne
	}
	for c2, _ := range t.clientsOneToMany {
		c2ProfileToCallbackIDsMapLock.RLock()
		if _, ok := c2ProfileToCallbackIDsMap[c2]; ok {
			if _, ok = c2ProfileToCallbackIDsMap[c2][CallbackAgentID]; ok {
				c2ProfileToCallbackIDsMapLock.RUnlock()
				if t.clientsOneToMany[c2].connected {
					return PushC2Connections.ConnectedOneToMany
				}
				return PushC2Connections.DisconnectedOneToMany
			}
		}
		c2ProfileToCallbackIDsMapLock.RUnlock()
	}
	return PushC2Connections.NeverConnected
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
	for c2, _ := range t.clientsOneToMany {
		if t.clientsOneToMany[c2].connected {
			c2ProfileToCallbackIDsMapLock.RLock()
			for newId, _ := range c2ProfileToCallbackIDsMap[c2] {
				clientIDs = append(clientIDs, newId)
			}
			c2ProfileToCallbackIDsMapLock.RUnlock()
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

var pushC2StreamingConnectNotification chan int
var pushC2StreamingDisconnectNotification chan int

func Initialize(connectNotification chan int, disconnectNotification chan int) {
	// need to open a port to accept gRPC connections
	var (
		connectString string
	)
	pushC2StreamingConnectNotification = connectNotification
	pushC2StreamingDisconnectNotification = disconnectNotification
	// initialize the clients
	TranslationContainerServer.clients = make(map[string]*grpcTranslationContainerClientConnections)
	TranslationContainerServer.connectionTimeout = connectionTimeoutSeconds * time.Second
	TranslationContainerServer.channelSendTimeout = channelSendTimeoutSeconds * time.Second
	// initial for push c2 servers
	PushC2Server.clients = make(map[int]*grpcPushC2ClientConnections)
	PushC2Server.clientsOneToMany = make(map[string]*grpcPushC2ClientConnections)
	PushC2Server.rabbitmqProcessPushC2AgentConnection = make(chan PushC2ServerConnected, 200)
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
