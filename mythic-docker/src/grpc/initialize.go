package grpc

import (
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"google.golang.org/grpc"
	"net"
	"sync"
	"time"
)

const (
	connectionTimeoutSeconds  = 3
	channelSendTimeoutSeconds = 2
)

type translationContainerServer struct {
	services.UnimplementedTranslationContainerServer
	sync.RWMutex
	clients            map[string]*grpcClientConnections
	connectionTimeout  time.Duration
	channelSendTimeout time.Duration
	listening          bool
	latestError        string
}

type grpcClientConnections struct {
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

var TranslationContainerServer translationContainerServer

func (t *translationContainerServer) addNewGenerateKeysClient(translationContainerName string) (chan services.TrGenerateEncryptionKeysMessage, chan services.TrGenerateEncryptionKeysMessageResponse, error) {
	t.Lock()
	if _, ok := t.clients[translationContainerName]; !ok {
		t.clients[translationContainerName] = &grpcClientConnections{}
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
		t.clients[translationContainerName] = &grpcClientConnections{}
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
		t.clients[translationContainerName] = &grpcClientConnections{}
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
	t.Lock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.Unlock()
		return t.clients[translationContainerName].generateKeysMessage,
			t.clients[translationContainerName].generateKeysMessageResponse,
			nil
	}
	t.Unlock()
	return nil, nil, errors.New("no translation container by that name currently connected")
}
func (t *translationContainerServer) SetGenerateKeysChannelExited(translationContainerName string) {
	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedGenerateKeys = false
	}
}
func (t *translationContainerServer) GetCustomToMythicChannels(translationContainerName string) (chan services.TrCustomMessageToMythicC2FormatMessage, chan services.TrCustomMessageToMythicC2FormatMessageResponse, error) {
	t.Lock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.Unlock()
		return t.clients[translationContainerName].translateCustomToMythicFormatMessage, t.clients[translationContainerName].translateCustomToMythicFormatMessageResponse, nil
	}
	t.Unlock()
	return nil, nil, errors.New("no translation container by that name currently connected")
}
func (t *translationContainerServer) SetCustomToMythicChannelExited(translationContainerName string) {

	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedCustomToMythic = false
	}
}
func (t *translationContainerServer) GetMythicToCustomChannels(translationContainerName string) (chan services.TrMythicC2ToCustomMessageFormatMessage, chan services.TrMythicC2ToCustomMessageFormatMessageResponse, error) {
	t.Lock()
	if _, ok := t.clients[translationContainerName]; ok {
		t.Unlock()
		return t.clients[translationContainerName].translateMythicToCustomFormatMessage, t.clients[translationContainerName].translateMythicToCustomFormatMessageResponse, nil
	}
	t.Unlock()
	return nil, nil, errors.New("no translation container by that name currently connected")
}
func (t *translationContainerServer) SetMythicToCustomChannelExited(translationContainerName string) {
	if _, ok := t.clients[translationContainerName]; ok {
		t.clients[translationContainerName].connectedMythicToCustom = false
	}
}
func (t *translationContainerServer) CheckClientConnected(translationContainerName string) bool {
	if _, ok := t.clients[translationContainerName]; ok {
		return t.clients[translationContainerName].connectedMythicToCustom &&
			t.clients[translationContainerName].connectedGenerateKeys &&
			t.clients[translationContainerName].connectedCustomToMythic
	} else {
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
func Initialize() {
	// need to open a port to accept gRPC connections
	var (
		connectString string
	)
	// initialize the clients
	TranslationContainerServer.clients = make(map[string]*grpcClientConnections)
	TranslationContainerServer.connectionTimeout = connectionTimeoutSeconds * time.Second
	TranslationContainerServer.channelSendTimeout = channelSendTimeoutSeconds * time.Second
	connectString = fmt.Sprintf("0.0.0.0:%d", utils.MythicConfig.ServerGRPCPort)
	go serveInBackground(connectString)

}
func serveInBackground(connectString string) {
	s := grpc.NewServer()
	services.RegisterTranslationContainerServer(s, &TranslationContainerServer)
	logging.LogInfo("Initializing grpc connections...")
	for {
		TranslationContainerServer.listening = false
		if listen, err := net.Listen("tcp", connectString); err != nil {
			logging.LogError(err, "Failed to open port for gRPC connections, retrying...")
			TranslationContainerServer.latestError = err.Error()
			time.Sleep(TranslationContainerServer.GetTimeout())
			continue
		} else {
			TranslationContainerServer.listening = true
			TranslationContainerServer.latestError = ""
			// create a new instance of a grpc server
			logging.LogInfo("gRPC Initialized", "connection", connectString)
			// tie the Servers to our new grpc server and our server struct
			// use the TCP port in listen to process requests for the grpc server s
			if err = s.Serve(listen); err != nil {
				logging.LogError(err, "Failed to listen for gRPC connections")
				TranslationContainerServer.latestError = err.Error()
			}
		}

	}

}
