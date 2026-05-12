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

func replaceSubmittedTasksForProxyTest(t *testing.T, tasks []submittedTask) {
	t.Helper()

	submittedTasksAwaitingFetching.Lock()
	oldTasks := submittedTasksAwaitingFetching.Tasks
	oldTasksByCallbackID := submittedTasksAwaitingFetching.tasksByCallbackID
	oldInteractiveTasksByCallbackID := submittedTasksAwaitingFetching.interactiveTasksByCallbackID
	oldCallbacksWithTasks := submittedTasksAwaitingFetching.callbacksWithTasks
	oldCallbacksWithInteractiveTasks := submittedTasksAwaitingFetching.callbacksWithInteractiveTasks
	oldTaskByID := submittedTasksAwaitingFetching.taskByID

	taskArray := make([]submittedTask, 0, len(tasks))
	submittedTasksAwaitingFetching.Tasks = &taskArray
	submittedTasksAwaitingFetching.resetTaskIndexesLocked()
	for _, task := range tasks {
		submittedTasksAwaitingFetching.addTaskLocked(task)
	}
	submittedTasksAwaitingFetching.Unlock()

	t.Cleanup(func() {
		submittedTasksAwaitingFetching.Lock()
		submittedTasksAwaitingFetching.Tasks = oldTasks
		submittedTasksAwaitingFetching.tasksByCallbackID = oldTasksByCallbackID
		submittedTasksAwaitingFetching.interactiveTasksByCallbackID = oldInteractiveTasksByCallbackID
		submittedTasksAwaitingFetching.callbacksWithTasks = oldCallbacksWithTasks
		submittedTasksAwaitingFetching.callbacksWithInteractiveTasks = oldCallbacksWithInteractiveTasks
		submittedTasksAwaitingFetching.taskByID = oldTaskByID
		submittedTasksAwaitingFetching.Unlock()
	})
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

	if !socksPort.queueProxyDataForAgent(proxyToAgentMessage{ServerID: 1, Message: []byte("socks")}) {
		t.Fatal("failed to queue socks message")
	}
	if !rpfwdPort.queueProxyDataForAgent(proxyToAgentMessage{ServerID: 2, Message: []byte("rpfwd")}) {
		t.Fatal("failed to queue rpfwd message")
	}
	if !interactivePort.queueInteractiveDataForAgent(agentMessagePostResponseInteractive{TaskUUID: "interactive"}) {
		t.Fatal("failed to queue interactive message")
	}

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

func TestCallbackPortsInUsePendingDelegateCallbacksSkipIdlePorts(t *testing.T) {
	replaceSubmittedTasksForProxyTest(t, nil)
	registry := callbackPortsInUse{}
	currentPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	idlePort := newTestCallbackPort(20, CALLBACK_PORT_TYPE_SOCKS, 7002, 2)
	pendingPort := newTestCallbackPort(30, CALLBACK_PORT_TYPE_RPORTFWD, 7003, 3)
	addTestCallbackPort(&registry, currentPort)
	addTestCallbackPort(&registry, idlePort)
	addTestCallbackPort(&registry, pendingPort)

	if callbackIDs := registry.GetOtherCallbackIdsWithPendingData(10); len(callbackIDs) != 0 {
		t.Fatalf("expected no delegate proxy callbacks before data is queued, got %#v", callbackIDs)
	}
	if !pendingPort.queueProxyDataForAgent(proxyToAgentMessage{ServerID: 1, Message: []byte("rpfwd")}) {
		t.Fatal("failed to queue rpfwd message")
	}

	if callbackIDs := registry.GetOtherCallbackIdsWithPendingData(10); !slices.Equal(callbackIDs, []int{30}) {
		t.Fatalf("expected only callback 30 to have pending delegate proxy data, got %#v", callbackIDs)
	}

	_ = pendingPort.GetProxyData()
	if callbackIDs := registry.GetOtherCallbackIdsWithPendingData(10); len(callbackIDs) != 0 {
		t.Fatalf("expected no delegate proxy callbacks after data is drained, got %#v", callbackIDs)
	}
}

func TestCallbackPortsInUsePendingDelegateCallbacksIncludeInteractiveTasks(t *testing.T) {
	replaceSubmittedTasksForProxyTest(t, []submittedTask{
		{TaskID: 100, CallbackID: 30, IsInteractiveTask: true},
		{TaskID: 101, CallbackID: 40, IsInteractiveTask: true},
	})
	registry := callbackPortsInUse{}
	currentPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	idlePort := newTestCallbackPort(20, CALLBACK_PORT_TYPE_SOCKS, 7002, 2)
	interactiveTaskPort := newTestCallbackPort(30, CALLBACK_PORT_TYPE_SOCKS, 7003, 3)
	addTestCallbackPort(&registry, currentPort)
	addTestCallbackPort(&registry, idlePort)
	addTestCallbackPort(&registry, interactiveTaskPort)

	if callbackIDs := registry.GetOtherCallbackIdsWithPendingData(10); !slices.Equal(callbackIDs, []int{30}) {
		t.Fatalf("expected only callback 30 to be eligible from interactive tasking, got %#v", callbackIDs)
	}
}

func TestCallbackPortsInUseRoutesAgentProxyMessageByLocalPort(t *testing.T) {
	registry := callbackPortsInUse{}
	firstPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	secondPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7002, 2)
	addTestCallbackPort(&registry, firstPort)
	addTestCallbackPort(&registry, secondPort)

	registry.routeProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID: 10,
		PortType:   CALLBACK_PORT_TYPE_SOCKS,
		Messages: []proxyFromAgentMessage{
			{ServerID: 1, Message: "second", Port: 7002},
		},
	})

	select {
	case message := <-secondPort.messagesFromAgent:
		if message.Message != "second" {
			t.Fatalf("expected message to route to second port, got %#v", message)
		}
	default:
		t.Fatal("expected message to route directly to local port 7002")
	}
	select {
	case message := <-firstPort.messagesFromAgent:
		t.Fatalf("expected first port to remain empty, got %#v", message)
	default:
	}
}

func TestCallbackPortsInUseRoutesAgentProxyMessageWithoutPortToFirstTypeMatch(t *testing.T) {
	registry := callbackPortsInUse{}
	firstPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_RPORTFWD, 7001, 1)
	secondPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_RPORTFWD, 7002, 2)
	addTestCallbackPort(&registry, firstPort)
	addTestCallbackPort(&registry, secondPort)

	registry.routeProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID: 10,
		PortType:   CALLBACK_PORT_TYPE_RPORTFWD,
		Messages: []proxyFromAgentMessage{
			{ServerID: 1, Message: "first"},
		},
	})

	select {
	case message := <-firstPort.messagesFromAgent:
		if message.Message != "first" {
			t.Fatalf("expected message to route to first matching port, got %#v", message)
		}
	default:
		t.Fatal("expected message without local port to route to first matching type")
	}
	select {
	case message := <-secondPort.messagesFromAgent:
		t.Fatalf("expected second port to remain empty, got %#v", message)
	default:
	}
}

func TestCallbackPortsInUseRemovesLocalPortRouteIndex(t *testing.T) {
	registry := callbackPortsInUse{}
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	addTestCallbackPort(&registry, port)
	removeTestCallbackPort(&registry, port)

	registry.routeProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID: 10,
		PortType:   CALLBACK_PORT_TYPE_SOCKS,
		Messages: []proxyFromAgentMessage{
			{ServerID: 1, Message: "removed", Port: 7001},
		},
	})

	select {
	case message := <-port.messagesFromAgent:
		t.Fatalf("expected removed port to remain empty, got %#v", message)
	default:
	}
}

func TestCallbackPortsInUseReplacesDuplicateLocalPortRouteIndex(t *testing.T) {
	registry := callbackPortsInUse{}
	firstPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)
	secondPort := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 2)
	addTestCallbackPort(&registry, firstPort)
	addTestCallbackPort(&registry, secondPort)
	removeTestCallbackPort(&registry, firstPort)

	registry.routeProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID: 10,
		PortType:   CALLBACK_PORT_TYPE_SOCKS,
		Messages: []proxyFromAgentMessage{
			{ServerID: 1, Message: "replacement", Port: 7001},
		},
	})

	select {
	case message := <-secondPort.messagesFromAgent:
		if message.Message != "replacement" {
			t.Fatalf("expected duplicate local port replacement to receive message, got %#v", message)
		}
	default:
		t.Fatal("expected duplicate local port replacement to receive message")
	}
}

func TestProxyFromAgentMessageShardPreservesCallbackOrdering(t *testing.T) {
	if firstShard := proxyFromAgentMessageShard(10, proxyFromAgentMessageShardCount); firstShard != proxyFromAgentMessageShard(10, proxyFromAgentMessageShardCount) {
		t.Fatalf("expected same callback to map to the same shard, got %d", firstShard)
	}
	if shard := proxyFromAgentMessageShard(10, 0); shard != 0 {
		t.Fatalf("expected zero shard count to return shard 0, got %d", shard)
	}
}

func TestCallbackPortUsagePendingDataTracksQueuedMessages(t *testing.T) {
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_SOCKS, 7001, 1)

	if port.hasPendingProxyDataForAgent() {
		t.Fatal("expected no pending data before queueing")
	}
	if !port.queueProxyDataForAgent(proxyToAgentMessage{ServerID: 1, Message: []byte("socks")}) {
		t.Fatal("failed to queue proxy message")
	}
	if got := port.pendingMessagesToAgent.Load(); got != 1 {
		t.Fatalf("expected one pending proxy message, got %d", got)
	}

	messages := port.GetProxyData()
	if len(messages) != 1 || string(messages[0].Message) != "socks" {
		t.Fatalf("expected queued proxy message to drain, got %#v", messages)
	}
	if got := port.pendingMessagesToAgent.Load(); got != 0 {
		t.Fatalf("expected pending proxy count to drain to zero, got %d", got)
	}
	if port.hasPendingProxyDataForAgent() {
		t.Fatal("expected no pending proxy data after drain")
	}
}

func TestCallbackPortUsagePendingDataTracksInteractiveMessages(t *testing.T) {
	port := newTestCallbackPort(10, CALLBACK_PORT_TYPE_INTERACTIVE, 7001, 1)

	if port.hasPendingInteractiveDataForAgent() {
		t.Fatal("expected no pending interactive data before queueing")
	}
	if !port.queueInteractiveDataForAgent(agentMessagePostResponseInteractive{TaskUUID: "interactive"}) {
		t.Fatal("failed to queue interactive message")
	}
	if got := port.pendingInteractiveMessagesToAgent.Load(); got != 1 {
		t.Fatalf("expected one pending interactive message, got %d", got)
	}

	messages := port.GetInteractiveData()
	if len(messages) != 1 || messages[0].TaskUUID != "interactive" {
		t.Fatalf("expected queued interactive message to drain, got %#v", messages)
	}
	if got := port.pendingInteractiveMessagesToAgent.Load(); got != 0 {
		t.Fatalf("expected pending interactive count to drain to zero, got %d", got)
	}
	if port.hasPendingInteractiveDataForAgent() {
		t.Fatal("expected no pending interactive data after drain")
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
