package rabbitmq

import (
	"slices"
	"testing"
)

func newTestCallbackPort(callbackID int, portType CallbackPortType, localPort int, taskID int) *callbackPortUsage {
	return &callbackPortUsage{
		CallbackID:                   callbackID,
		PortType:                     portType,
		LocalPort:                    localPort,
		TaskID:                       taskID,
		OperationID:                  1,
		messagesToAgent:              make(chan proxyToAgentMessage, 10),
		interactiveMessagesToAgent:   make(chan agentMessagePostResponseInteractive, 10),
		messagesFromAgent:            make(chan proxyFromAgentMessage, 10),
		interactiveMessagesFromAgent: make(chan agentMessagePostResponseInteractive, 10),
		stopAllConnections:           make(chan bool, 1),
	}
}

func addTestCallbackPort(registry *callbackPortsInUse, port *callbackPortUsage) {
	registry.Lock()
	defer registry.Unlock()
	registry.addPortLocked(port)
}

func removeTestCallbackPort(registry *callbackPortsInUse, port *callbackPortUsage) {
	registry.Lock()
	defer registry.Unlock()
	registry.removePortLocked(port)
}

func TestCallbackPortsInUseIndexesCallbacksAndPortTypes(t *testing.T) {
	registry := callbackPortsInUse{}
	socksPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	rpfwdPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_RPORTFWD, 7002, 2)
	otherPort := newTestCallbackPort(20, CALLBACK_PORT_TYPE_SOCKS, 8001, 3)
	addTestCallbackPort(&registry, socksPort)
	addTestCallbackPort(&registry, rpfwdPort)
	addTestCallbackPort(&registry, otherPort)

	if callbackIDs := registry.GetOtherCallbackIds(10); !slices.Equal(callbackIDs, []int{20}) {
		t.Fatalf("expected callback IDs [20], got %#v", callbackIDs)
	}
	if port := registry.GetPortForTypeAndCallback(0, 10, CALLBACK_PORT_TYPE_SOCKS); port != 7001 {
		t.Fatalf("expected socks local port 7001, got %d", port)
	}
	if port := registry.GetPortForTypeAndCallback(2, 10, CALLBACK_PORT_TYPE_RPORTFWD); port != 7002 {
		t.Fatalf("expected rpfwd local port 7002, got %d", port)
	}

	removeTestCallbackPort(&registry, otherPort)
	if callbackIDs := registry.GetOtherCallbackIds(10); len(callbackIDs) != 0 {
		t.Fatalf("expected no other callback IDs after removing other port, got %#v", callbackIDs)
	}
}

func TestCallbackPortsInUseCombinedDataFetchUsesIndexedPorts(t *testing.T) {
	registry := callbackPortsInUse{}
	socksPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	rpfwdPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_RPORTFWD, 7002, 2)
	interactivePort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_INTERACTIVE, 7003, 3)
	addTestCallbackPort(&registry, socksPort)
	addTestCallbackPort(&registry, rpfwdPort)
	addTestCallbackPort(&registry, interactivePort)

	socksPort.messagesToAgent <- proxyToAgentMessage{ServerID: 1, Message: []byte("socks")}
	rpfwdPort.messagesToAgent <- proxyToAgentMessage{ServerID: 2, Message: []byte("rpfwd")}
	interactivePort.interactiveMessagesToAgent <- agentMessagePostResponseInteractive{TaskUUID: "interactive"}

	proxyData, err := registry.GetDataForCallbackIdAllTypes(10)
	if err != nil {
		t.Fatalf("unexpected error fetching proxy data: %v", err)
	}
	if len(proxyData.Socks) != 1 || string(proxyData.Socks[0].Message) != "socks" {
		t.Fatalf("expected one socks message, got %#v", proxyData.Socks)
	}
	if len(proxyData.Rpfwd) != 1 || string(proxyData.Rpfwd[0].Message) != "rpfwd" {
		t.Fatalf("expected one rpfwd message, got %#v", proxyData.Rpfwd)
	}
	if len(proxyData.Interactive) != 1 || proxyData.Interactive[0].TaskUUID != "interactive" {
		t.Fatalf("expected one interactive message, got %#v", proxyData.Interactive)
	}

	proxyData, err = registry.GetDataForCallbackIdAllTypes(10)
	if err != nil {
		t.Fatalf("unexpected error fetching proxy data second time: %v", err)
	}
	if len(proxyData.Socks) != 0 || len(proxyData.Rpfwd) != 0 || len(proxyData.Interactive) != 0 {
		t.Fatalf("expected proxy data to be drained, got %#v", proxyData)
	}
}
