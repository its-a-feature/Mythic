package rabbitmq

import (
	"slices"
	"sync"
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

func TestCallbackPortUsageByteCountersAccumulateWithoutChannels(t *testing.T) {
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	port.initializeByteCounters(10, 20)

	port.addBytesSentToAgent(5)
	port.addBytesReceivedFromAgent(7)

	if got := port.bytesSentToAgent.Load(); got != 15 {
		t.Fatalf("expected bytes sent to agent to be 15, got %d", got)
	}
	if got := port.bytesReceivedFromAgent.Load(); got != 27 {
		t.Fatalf("expected bytes received from agent to be 27, got %d", got)
	}
	if got := port.lastFlushedBytesSentToAgent.Load(); got != 10 {
		t.Fatalf("expected last flushed bytes sent to agent to remain 10, got %d", got)
	}
	if got := port.lastFlushedBytesReceivedFromAgent.Load(); got != 20 {
		t.Fatalf("expected last flushed bytes received from agent to remain 20, got %d", got)
	}
}

func TestCallbackPortUsageByteCountersApplyPersistedBaseline(t *testing.T) {
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	port.initializeByteCounters(0, 0)
	port.addBytesSentToAgent(3)
	port.addBytesReceivedFromAgent(4)

	port.applyPersistedByteCounters(100, 200)

	if got := port.bytesSentToAgent.Load(); got != 103 {
		t.Fatalf("expected bytes sent to agent to include persisted baseline and pending delta, got %d", got)
	}
	if got := port.bytesReceivedFromAgent.Load(); got != 204 {
		t.Fatalf("expected bytes received from agent to include persisted baseline and pending delta, got %d", got)
	}
	if got := port.lastFlushedBytesSentToAgent.Load(); got != 100 {
		t.Fatalf("expected last flushed bytes sent to agent to track persisted baseline, got %d", got)
	}
	if got := port.lastFlushedBytesReceivedFromAgent.Load(); got != 200 {
		t.Fatalf("expected last flushed bytes received from agent to track persisted baseline, got %d", got)
	}
}

func TestCallbackPortUsageByteCountersClampAtPostgresBigint(t *testing.T) {
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	port.initializeByteCounters(POSTGRES_MAX_BIGINT-2, POSTGRES_MAX_BIGINT-3)

	port.addBytesSentToAgent(10)
	port.addBytesReceivedFromAgent(10)

	if got := port.bytesSentToAgent.Load(); got != POSTGRES_MAX_BIGINT-1 {
		t.Fatalf("expected bytes sent to agent to clamp to %d, got %d", POSTGRES_MAX_BIGINT-1, got)
	}
	if got := port.bytesReceivedFromAgent.Load(); got != POSTGRES_MAX_BIGINT-1 {
		t.Fatalf("expected bytes received from agent to clamp to %d, got %d", POSTGRES_MAX_BIGINT-1, got)
	}
}

func TestCallbackPortUsageByteCountersHandleConcurrentAdds(t *testing.T) {
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	port.initializeByteCounters(5, 7)

	const goroutineCount = 32
	const incrementsPerGoroutine = 1000
	var wg sync.WaitGroup
	wg.Add(goroutineCount)
	for i := 0; i < goroutineCount; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < incrementsPerGoroutine; j++ {
				port.addBytesSentToAgent(1)
				port.addBytesReceivedFromAgent(2)
			}
		}()
	}
	wg.Wait()

	expectedSent := int64(5 + goroutineCount*incrementsPerGoroutine)
	expectedReceived := int64(7 + goroutineCount*incrementsPerGoroutine*2)
	if got := port.bytesSentToAgent.Load(); got != expectedSent {
		t.Fatalf("expected bytes sent to agent to be %d, got %d", expectedSent, got)
	}
	if got := port.bytesReceivedFromAgent.Load(); got != expectedReceived {
		t.Fatalf("expected bytes received from agent to be %d, got %d", expectedReceived, got)
	}
}
