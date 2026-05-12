package rabbitmq

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net"
	"sort"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

type CallbackPortType = string

const (
	CALLBACK_PORT_TYPE_SOCKS        CallbackPortType = "socks"
	CALLBACK_PORT_TYPE_RPORTFWD                      = "rpfwd"
	CALLBACK_PORT_TYPE_INTERACTIVE                   = "interactive"
	callbackPortByteFlushInterval                    = 20 * time.Second
	proxyFromAgentMessageShardCount                  = 16
	proxyFromAgentMessageShardSize                   = 1000
)

type proxyToAgentMessage struct {
	ServerID uint32 `json:"server_id" mapstructure:"server_id"`
	Message  []byte `json:"data" mapstructure:"data"`
	IsExit   bool   `json:"exit" mapstructure:"exit"`
	Port     int    `json:"port,omitempty" mapstructure:"port,omitempty"`
}
type proxyFromAgentMessage struct {
	ServerID uint32 `json:"server_id" mapstructure:"server_id"`
	Message  string `json:"data" mapstructure:"data"`
	IsExit   bool   `json:"exit" mapstructure:"exit"`
	Port     int    `json:"port" mapstructure:"port"`
}
type acceptedConnection struct {
	conn                         net.Conn
	udpListener                  *net.UDPConn
	port                         int
	shouldClose                  chan bool
	messagesFromAgent            chan proxyFromAgentMessage
	interactiveMessagesFromAgent chan agentMessagePostResponseInteractive
	ServerID                     uint32
	TaskUUID                     *string
	AgentClosedConnection        bool
}
type callbackPortUsage struct {
	CallbackPortID                    int              `json:"id" db:"id"`
	CallbackID                        int              `json:"callback_id" db:"callback_id"`
	CallbackDisplayID                 int              `json:"callback_display_id" db:"callback_display_id"`
	TaskID                            int              `json:"task_id" db:"task_id"`
	LocalPort                         int              `json:"local_port" db:"local_port"`
	RemotePort                        int              `json:"remote_port" db:"remote_port"`
	RemoteIP                          string           `json:"remote_ip" db:"remote_ip"`
	OperationID                       int              `json:"operation_id" db:"operation_id"`
	Username                          string           `json:"username" db:"username"`
	Password                          string           `json:"password" db:"password"`
	PortType                          CallbackPortType `json:"port_type" db:"port_type"`
	listener                          *net.Listener
	bytesReceivedFromAgent            atomic.Int64
	bytesSentToAgent                  atomic.Int64
	lastFlushedBytesReceivedFromAgent atomic.Int64
	lastFlushedBytesSentToAgent       atomic.Int64
	pendingMessagesToAgent            atomic.Int64
	pendingInteractiveMessagesToAgent atomic.Int64
	acceptedConnections               *[]*acceptedConnection
	messagesToAgent                   chan proxyToAgentMessage
	interactiveMessagesToAgent        chan agentMessagePostResponseInteractive
	newConnectionChannel              chan *acceptedConnection
	removeConnectionsChannel          chan *acceptedConnection
	// messagesFromAgent - these get parsed by manageConnections and passed to the right connection's messagesFromAgent
	messagesFromAgent            chan proxyFromAgentMessage
	interactiveMessagesFromAgent chan agentMessagePostResponseInteractive
	stopAllConnections           chan bool
}

type callbackPortsInUse struct {
	ports                             []*callbackPortUsage
	portsByCallbackID                 map[int][]*callbackPortUsage
	portsByCallbackIDAndType          map[int]map[CallbackPortType][]*callbackPortUsage
	portsByCallbackIDTypeAndLocalPort map[int]map[CallbackPortType]map[int]*callbackPortUsage
	callbacksWithPorts                []int
	proxyFromAgentMessageChannels     []chan ProxyFromAgentMessageForMythic
	sync.RWMutex
}

type callbackProxyData struct {
	Socks       []proxyToAgentMessage
	Rpfwd       []proxyToAgentMessage
	Interactive []agentMessagePostResponseInteractive
}

var proxyPorts callbackPortsInUse

type ProxyStopResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}
type ProxyStop struct {
	CallbackPortId    int
	Action            string
	OperatorOperation databaseStructs.Operatoroperation
}
type ProxyFromAgentMessageForMythic struct {
	CallbackID          int
	PortType            CallbackPortType
	Messages            []proxyFromAgentMessage
	InteractiveMessages []agentMessagePostResponseInteractive
}
type ProxyTest struct {
	CallbackPortId    int
	OperatorOperation databaseStructs.Operatoroperation
}
type ProxyTestResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func ManuallyTestProxy(input ProxyTest) ProxyTestResponse {
	resp := ProxyTestResponse{
		Status: "error",
		Error:  "callback and port not found",
	}
	callbackPort := databaseStructs.Callbackport{}
	err := database.DB.Get(&callbackPort, `SELECT * FROM callbackport 
         WHERE id=$1 AND operation_id=$2`, input.CallbackPortId, input.OperatorOperation.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to find callback port information for manual proxy toggle")
		resp.Error = "Failed to find callback port information"
		return resp
	}
	err = proxyPorts.Test(callbackPort.CallbackID, callbackPort.PortType,
		callbackPort.LocalPort, callbackPort.RemotePort, callbackPort.RemoteIP,
		input.OperatorOperation.CurrentOperation.ID, callbackPort.ID)
	if err != nil {
		resp.Error = err.Error()
		return resp
	}
	resp.Status = "success"
	resp.Error = ""
	return resp
}
func ManuallyToggleProxy(input ProxyStop) ProxyStopResponse {
	resp := ProxyStopResponse{
		Status: "error",
		Error:  "callback and port not found",
	}
	callbackPort := databaseStructs.Callbackport{}
	err := database.DB.Get(&callbackPort, `SELECT * FROM callbackport 
         WHERE id=$1 AND operation_id=$2`, input.CallbackPortId, input.OperatorOperation.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to find callback port information for manual proxy toggle")
		resp.Error = "Failed to find callback port information"
		return resp
	}
	if input.Action == "start" {
		err = proxyPorts.Add(callbackPort.CallbackID,
			callbackPort.PortType,
			callbackPort.LocalPort,
			callbackPort.RemotePort,
			callbackPort.RemoteIP,
			callbackPort.TaskID,
			input.OperatorOperation.CurrentOperation.ID,
			callbackPort.BytesSent,
			callbackPort.BytesReceived,
			callbackPort.ID,
			callbackPort.Username,
			callbackPort.Password)
		if err != nil {
			resp.Error = err.Error()
			return resp
		}
		resp.Status = "success"
		resp.Error = ""
		_, err = database.DB.NamedExec(`UPDATE callbackport SET deleted=false WHERE id=:id`, callbackPort)
		if err != nil {
			logging.LogError(err, "Failed to update database to mark callback port as not deleted")
		}
		return resp

	} else if input.Action == "stop" {
		err = proxyPorts.Remove(callbackPort.CallbackID,
			callbackPort.PortType,
			callbackPort.LocalPort,
			input.OperatorOperation.CurrentOperation.ID,
			callbackPort.RemoteIP,
			callbackPort.RemotePort,
			callbackPort.Username,
			callbackPort.Password,
		)
		if err != nil {
			resp.Error = err.Error()
		}
		resp.Status = "success"
		resp.Error = ""
		_, err = database.DB.NamedExec(`UPDATE callbackport SET deleted=true WHERE id=:id`, callbackPort)
		if err != nil {
			logging.LogError(err, "Failed to update database to mark callback port as deleted")
		}
		return resp

	} else {
		resp.Error = "Unknown action, expected 'start' or 'stop'"
		return resp
	}
}
func (c *callbackPortsInUse) Initialize() {
	callbackPorts := []databaseStructs.Callbackport{}
	c.Lock()
	c.ports = make([]*callbackPortUsage, 0)
	c.resetPortIndexesLocked()
	c.proxyFromAgentMessageChannels = makeProxyFromAgentMessageChannels()
	proxyFromAgentMessageChannels := c.proxyFromAgentMessageChannels
	c.Unlock()
	c.startProxyFromAgentMessageListeners(proxyFromAgentMessageChannels)
	go c.ListenForNewByteTransferUpdates()
	if err := database.DB.Select(&callbackPorts, `SELECT 
    	callbackport.id, callbackport.callback_id, callbackport.task_id, 
    	callbackport.local_port, callbackport.remote_port, callbackport.remote_ip,
    	callbackport.port_type, callbackport.operation_id, callbackport.username,
        callbackport.password, callbackport.bytes_sent, callbackport.bytes_received,
    	callback.display_id "callback.display_id"
		FROM callbackport 
		JOIN callback ON callbackport.callback_id=callback.id
		WHERE deleted=false`); err != nil {
		logging.LogError(err, "Failed to load callback ports from database")
	} else {
		for _, proxy := range callbackPorts {
			newPort := callbackPortUsage{
				CallbackPortID:               proxy.ID,
				CallbackID:                   proxy.CallbackID,
				CallbackDisplayID:            proxy.Callback.DisplayID,
				TaskID:                       proxy.TaskID,
				LocalPort:                    proxy.LocalPort,
				RemoteIP:                     proxy.RemoteIP,
				RemotePort:                   proxy.RemotePort,
				PortType:                     proxy.PortType,
				OperationID:                  proxy.OperationID,
				Username:                     proxy.Username,
				Password:                     proxy.Password,
				messagesToAgent:              make(chan proxyToAgentMessage, 1000),
				newConnectionChannel:         make(chan *acceptedConnection, 1000),
				removeConnectionsChannel:     make(chan *acceptedConnection, 1000),
				messagesFromAgent:            make(chan proxyFromAgentMessage, 1000),
				interactiveMessagesToAgent:   make(chan agentMessagePostResponseInteractive, 1000),
				interactiveMessagesFromAgent: make(chan agentMessagePostResponseInteractive, 1000),
				stopAllConnections:           make(chan bool),
			}
			newPort.initializeByteCounters(proxy.BytesSent, proxy.BytesReceived)
			acceptedConnections := make([]*acceptedConnection, 0)
			newPort.acceptedConnections = &acceptedConnections
			if err := newPort.Start(); err != nil {
				logging.LogError(err, "Failed to start listening", "port info", &newPort)
			} else {
				c.Lock()
				c.addPortLocked(&newPort)
				c.Unlock()
			}
		}
	}
}

func (c *callbackPortsInUse) resetPortIndexesLocked() {
	c.portsByCallbackID = make(map[int][]*callbackPortUsage)
	c.portsByCallbackIDAndType = make(map[int]map[CallbackPortType][]*callbackPortUsage)
	c.portsByCallbackIDTypeAndLocalPort = make(map[int]map[CallbackPortType]map[int]*callbackPortUsage)
	c.callbacksWithPorts = make([]int, 0)
}

func (c *callbackPortsInUse) ensurePortIndexesLocked() {
	if c.portsByCallbackID == nil || c.portsByCallbackIDAndType == nil || c.portsByCallbackIDTypeAndLocalPort == nil {
		ports := c.ports
		c.resetPortIndexesLocked()
		for _, port := range ports {
			c.addPortToIndexesLocked(port)
		}
	}
}

func makeProxyFromAgentMessageChannels() []chan ProxyFromAgentMessageForMythic {
	channels := make([]chan ProxyFromAgentMessageForMythic, proxyFromAgentMessageShardCount)
	for i := range channels {
		channels[i] = make(chan ProxyFromAgentMessageForMythic, proxyFromAgentMessageShardSize)
	}
	return channels
}

func proxyFromAgentMessageShard(callbackID int, shardCount int) int {
	if shardCount <= 0 {
		return 0
	}
	if callbackID < 0 {
		callbackID = -callbackID
	}
	return callbackID % shardCount
}

func (c *callbackPortsInUse) startProxyFromAgentMessageListeners(channels []chan ProxyFromAgentMessageForMythic) {
	for _, channel := range channels {
		go c.ListenForProxyFromAgentMessage(channel)
	}
}

func (c *callbackPortsInUse) addPortLocked(port *callbackPortUsage) {
	c.ensurePortIndexesLocked()
	c.ports = append(c.ports, port)
	c.addPortToIndexesLocked(port)
}

func (c *callbackPortsInUse) addPortToIndexesLocked(port *callbackPortUsage) {
	if len(c.portsByCallbackID[port.CallbackID]) == 0 {
		c.callbacksWithPorts = append(c.callbacksWithPorts, port.CallbackID)
	}
	c.portsByCallbackID[port.CallbackID] = append(c.portsByCallbackID[port.CallbackID], port)
	if _, ok := c.portsByCallbackIDAndType[port.CallbackID]; !ok {
		c.portsByCallbackIDAndType[port.CallbackID] = make(map[CallbackPortType][]*callbackPortUsage)
	}
	c.portsByCallbackIDAndType[port.CallbackID][port.PortType] = append(c.portsByCallbackIDAndType[port.CallbackID][port.PortType], port)
	if _, ok := c.portsByCallbackIDTypeAndLocalPort[port.CallbackID]; !ok {
		c.portsByCallbackIDTypeAndLocalPort[port.CallbackID] = make(map[CallbackPortType]map[int]*callbackPortUsage)
	}
	if _, ok := c.portsByCallbackIDTypeAndLocalPort[port.CallbackID][port.PortType]; !ok {
		c.portsByCallbackIDTypeAndLocalPort[port.CallbackID][port.PortType] = make(map[int]*callbackPortUsage)
	}
	if _, ok := c.portsByCallbackIDTypeAndLocalPort[port.CallbackID][port.PortType][port.LocalPort]; !ok {
		c.portsByCallbackIDTypeAndLocalPort[port.CallbackID][port.PortType][port.LocalPort] = port
	}
}

func (c *callbackPortsInUse) removePortLocked(port *callbackPortUsage) bool {
	c.ensurePortIndexesLocked()
	found := false
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i] == port {
			c.ports = append(c.ports[:i], c.ports[i+1:]...)
			found = true
			break
		}
	}
	if found {
		c.removePortFromIndexesLocked(port)
	}
	return found
}

func (c *callbackPortsInUse) removePortFromIndexesLocked(port *callbackPortUsage) {
	c.portsByCallbackID[port.CallbackID] = removeCallbackPortUsage(c.portsByCallbackID[port.CallbackID], port)
	if len(c.portsByCallbackID[port.CallbackID]) == 0 {
		delete(c.portsByCallbackID, port.CallbackID)
		delete(c.portsByCallbackIDAndType, port.CallbackID)
		delete(c.portsByCallbackIDTypeAndLocalPort, port.CallbackID)
		c.callbacksWithPorts = removeProxyCallbackID(c.callbacksWithPorts, port.CallbackID)
		return
	}
	c.portsByCallbackIDAndType[port.CallbackID][port.PortType] = removeCallbackPortUsage(c.portsByCallbackIDAndType[port.CallbackID][port.PortType], port)
	if len(c.portsByCallbackIDAndType[port.CallbackID][port.PortType]) == 0 {
		delete(c.portsByCallbackIDAndType[port.CallbackID], port.PortType)
		delete(c.portsByCallbackIDTypeAndLocalPort[port.CallbackID], port.PortType)
		if len(c.portsByCallbackIDTypeAndLocalPort[port.CallbackID]) == 0 {
			delete(c.portsByCallbackIDTypeAndLocalPort, port.CallbackID)
		}
		return
	}
	c.replaceLocalPortIndexAfterRemovalLocked(port)
}

func (c *callbackPortsInUse) replaceLocalPortIndexAfterRemovalLocked(port *callbackPortUsage) {
	localPortIndex := c.portsByCallbackIDTypeAndLocalPort[port.CallbackID][port.PortType]
	if localPortIndex[port.LocalPort] != port {
		return
	}
	delete(localPortIndex, port.LocalPort)
	for _, replacementPort := range c.portsByCallbackIDAndType[port.CallbackID][port.PortType] {
		if replacementPort.LocalPort == port.LocalPort {
			localPortIndex[port.LocalPort] = replacementPort
			return
		}
	}
}

func removeCallbackPortUsage(ports []*callbackPortUsage, port *callbackPortUsage) []*callbackPortUsage {
	for i, currentPort := range ports {
		if currentPort == port {
			return append(ports[:i], ports[i+1:]...)
		}
	}
	return ports
}

func removeProxyCallbackID(callbackIDs []int, callbackID int) []int {
	for i, currentCallbackID := range callbackIDs {
		if currentCallbackID == callbackID {
			return append(callbackIDs[:i], callbackIDs[i+1:]...)
		}
	}
	return callbackIDs
}

func cloneCallbackPortUsages(ports []*callbackPortUsage) []*callbackPortUsage {
	return append([]*callbackPortUsage(nil), ports...)
}

// queueProxyDataForAgent records that a SOCKS/RPFWD message is pending before
// placing it on the buffered channel. GetProxyData uses the counter as a cheap
// fast path so frequent agent polls do not allocate and drain empty queues.
func (p *callbackPortUsage) queueProxyDataForAgent(message proxyToAgentMessage) bool {
	p.pendingMessagesToAgent.Add(1)
	select {
	case p.messagesToAgent <- message:
		return true
	default:
		p.pendingMessagesToAgent.Add(-1)
		return false
	}
}

// queueInteractiveDataForAgent mirrors queueProxyDataForAgent for interactive
// terminal data. Interactive task lookup remains separate because it can create
// outbound data even when the channel itself is empty.
func (p *callbackPortUsage) queueInteractiveDataForAgent(message agentMessagePostResponseInteractive) bool {
	p.pendingInteractiveMessagesToAgent.Add(1)
	select {
	case p.interactiveMessagesToAgent <- message:
		return true
	default:
		p.pendingInteractiveMessagesToAgent.Add(-1)
		return false
	}
}

func (p *callbackPortUsage) hasPendingProxyDataForAgent() bool {
	return p.pendingMessagesToAgent.Load() > 0 || len(p.messagesToAgent) > 0
}

func (p *callbackPortUsage) hasPendingInteractiveDataForAgent() bool {
	return p.pendingInteractiveMessagesToAgent.Load() > 0 || len(p.interactiveMessagesToAgent) > 0
}

func (p *callbackPortUsage) hasPendingDataForAgent() bool {
	switch p.PortType {
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		return p.hasPendingInteractiveDataForAgent()
	case CALLBACK_PORT_TYPE_SOCKS:
		fallthrough
	case CALLBACK_PORT_TYPE_RPORTFWD:
		return p.hasPendingProxyDataForAgent()
	default:
		return false
	}
}

func callbackPortUsagesHavePendingData(ports []*callbackPortUsage) bool {
	for _, port := range ports {
		if port.hasPendingDataForAgent() {
			return true
		}
	}
	return false
}

func decrementPositiveAtomicCounter(counter *atomic.Int64) {
	for {
		current := counter.Load()
		if current <= 0 {
			return
		}
		if counter.CompareAndSwap(current, current-1) {
			return
		}
	}
}

func clampCallbackPortByteCount(value int64) int64 {
	if value < 0 {
		return 0
	}
	if value >= POSTGRES_MAX_BIGINT {
		return POSTGRES_MAX_BIGINT - 1
	}
	return value
}

func addCallbackPortByteCounts(value int64, delta int64) int64 {
	value = clampCallbackPortByteCount(value)
	if delta <= 0 {
		return value
	}
	if delta >= POSTGRES_MAX_BIGINT-value {
		return POSTGRES_MAX_BIGINT - 1
	}
	return value + delta
}

func addClampedAtomicInt64(counter *atomic.Int64, delta int64) {
	if delta <= 0 {
		return
	}
	for {
		current := counter.Load()
		next := addCallbackPortByteCounts(current, delta)
		if next == current || counter.CompareAndSwap(current, next) {
			return
		}
	}
}

func (p *callbackPortUsage) initializeByteCounters(bytesSentToAgent int64, bytesReceivedFromAgent int64) {
	bytesSentToAgent = clampCallbackPortByteCount(bytesSentToAgent)
	bytesReceivedFromAgent = clampCallbackPortByteCount(bytesReceivedFromAgent)
	p.bytesSentToAgent.Store(bytesSentToAgent)
	p.lastFlushedBytesSentToAgent.Store(bytesSentToAgent)
	p.bytesReceivedFromAgent.Store(bytesReceivedFromAgent)
	p.lastFlushedBytesReceivedFromAgent.Store(bytesReceivedFromAgent)
}

func (p *callbackPortUsage) applyPersistedByteCounters(bytesSentToAgent int64, bytesReceivedFromAgent int64) {
	applyPersistedByteCounter(&p.bytesSentToAgent, &p.lastFlushedBytesSentToAgent, bytesSentToAgent)
	applyPersistedByteCounter(&p.bytesReceivedFromAgent, &p.lastFlushedBytesReceivedFromAgent, bytesReceivedFromAgent)
}

func applyPersistedByteCounter(counter *atomic.Int64, lastFlushed *atomic.Int64, persistedValue int64) {
	persistedValue = clampCallbackPortByteCount(persistedValue)
	for {
		currentDelta := counter.Load()
		next := addCallbackPortByteCounts(persistedValue, currentDelta)
		if counter.CompareAndSwap(currentDelta, next) {
			lastFlushed.Store(persistedValue)
			return
		}
	}
}

func (p *callbackPortUsage) addBytesSentToAgent(byteCount int64) {
	addClampedAtomicInt64(&p.bytesSentToAgent, byteCount)
}

func (p *callbackPortUsage) addBytesReceivedFromAgent(byteCount int64) {
	addClampedAtomicInt64(&p.bytesReceivedFromAgent, byteCount)
}

func (p *callbackPortUsage) flushByteCounters() {
	if p.CallbackPortID <= 0 {
		return
	}
	currentBytesSentToAgent := p.bytesSentToAgent.Load()
	bytesSentToAgent := clampCallbackPortByteCount(currentBytesSentToAgent)
	if bytesSentToAgent != currentBytesSentToAgent {
		p.bytesSentToAgent.CompareAndSwap(currentBytesSentToAgent, bytesSentToAgent)
	}
	if bytesSentToAgent != p.lastFlushedBytesSentToAgent.Load() &&
		updateCallbackPortStats("bytes_sent", bytesSentToAgent, p.CallbackPortID) {
		p.lastFlushedBytesSentToAgent.Store(bytesSentToAgent)
	}
	currentBytesReceivedFromAgent := p.bytesReceivedFromAgent.Load()
	bytesReceivedFromAgent := clampCallbackPortByteCount(currentBytesReceivedFromAgent)
	if bytesReceivedFromAgent != currentBytesReceivedFromAgent {
		p.bytesReceivedFromAgent.CompareAndSwap(currentBytesReceivedFromAgent, bytesReceivedFromAgent)
	}
	if bytesReceivedFromAgent != p.lastFlushedBytesReceivedFromAgent.Load() &&
		updateCallbackPortStats("bytes_received", bytesReceivedFromAgent, p.CallbackPortID) {
		p.lastFlushedBytesReceivedFromAgent.Store(bytesReceivedFromAgent)
	}
}

func (c *callbackPortsInUse) flushChangedByteCounters() {
	c.RLock()
	ports := cloneCallbackPortUsages(c.ports)
	c.RUnlock()
	for _, port := range ports {
		port.flushByteCounters()
	}
}

func (c *callbackPortsInUse) getPortsForCallbackAndType(callbackID int, portType CallbackPortType) []*callbackPortUsage {
	c.RLock()
	defer c.RUnlock()
	if c.portsByCallbackIDAndType == nil {
		return c.getPortsForCallbackAndTypeFromSliceLocked(callbackID, portType)
	}
	return cloneCallbackPortUsages(c.portsByCallbackIDAndType[callbackID][portType])
}

func (c *callbackPortsInUse) getPortsForCallbackAndTypeFromSliceLocked(callbackID int, portType CallbackPortType) []*callbackPortUsage {
	ports := make([]*callbackPortUsage, 0)
	for _, port := range c.ports {
		if port.CallbackID == callbackID && port.PortType == portType {
			ports = append(ports, port)
		}
	}
	return ports
}

func (c *callbackPortsInUse) getPortForCallbackTypeAndLocalPort(callbackID int, portType CallbackPortType, localPort int) *callbackPortUsage {
	c.RLock()
	defer c.RUnlock()
	if localPort > 0 && c.portsByCallbackIDTypeAndLocalPort != nil {
		return c.portsByCallbackIDTypeAndLocalPort[callbackID][portType][localPort]
	}
	if c.portsByCallbackIDAndType != nil {
		ports := c.portsByCallbackIDAndType[callbackID][portType]
		if localPort <= 0 {
			if len(ports) == 0 {
				return nil
			}
			return ports[0]
		}
		for _, port := range ports {
			if port.LocalPort == localPort {
				return port
			}
		}
		return nil
	}
	for _, port := range c.ports {
		if port.CallbackID != callbackID || port.PortType != portType {
			continue
		}
		if localPort <= 0 || port.LocalPort == localPort {
			return port
		}
	}
	return nil
}

func (c *callbackPortsInUse) getPortsForCallbackByType(callbackID int, portTypes []CallbackPortType) map[CallbackPortType][]*callbackPortUsage {
	portsByType := make(map[CallbackPortType][]*callbackPortUsage, len(portTypes))
	c.RLock()
	defer c.RUnlock()
	if c.portsByCallbackIDAndType == nil {
		for _, portType := range portTypes {
			portsByType[portType] = c.getPortsForCallbackAndTypeFromSliceLocked(callbackID, portType)
		}
		return portsByType
	}
	for _, portType := range portTypes {
		portsByType[portType] = cloneCallbackPortUsages(c.portsByCallbackIDAndType[callbackID][portType])
	}
	return portsByType
}

// getPortsWithPendingDataForCallbackByType returns only ports that have data
// buffered for the agent. The common no-data poll avoids cloning every active
// port slice and avoids calling the drain methods that allocate response slices.
func (c *callbackPortsInUse) getPortsWithPendingDataForCallbackByType(callbackID int, portTypes []CallbackPortType) map[CallbackPortType][]*callbackPortUsage {
	var portsByType map[CallbackPortType][]*callbackPortUsage
	appendPendingPort := func(portType CallbackPortType, port *callbackPortUsage) {
		if portsByType == nil {
			portsByType = make(map[CallbackPortType][]*callbackPortUsage, len(portTypes))
		}
		portsByType[portType] = append(portsByType[portType], port)
	}
	c.RLock()
	defer c.RUnlock()
	if c.portsByCallbackIDAndType == nil {
		for _, port := range c.ports {
			if port.CallbackID != callbackID || !port.hasPendingDataForAgent() {
				continue
			}
			for _, portType := range portTypes {
				if port.PortType == portType {
					appendPendingPort(portType, port)
					break
				}
			}
		}
		return portsByType
	}
	for _, portType := range portTypes {
		for _, port := range c.portsByCallbackIDAndType[callbackID][portType] {
			if port.hasPendingDataForAgent() {
				appendPendingPort(portType, port)
			}
		}
	}
	return portsByType
}

func (c *callbackPortsInUse) findPortForRemoval(callbackId int, portType CallbackPortType, localPort int, operationId int, remoteIP string, remotePort int,
	username string, password string) *callbackPortUsage {
	c.RLock()
	defer c.RUnlock()
	ports := c.portsByCallbackIDAndType[callbackId][portType]
	if c.portsByCallbackIDAndType == nil {
		ports = c.getPortsForCallbackAndTypeFromSliceLocked(callbackId, portType)
	}
	for _, port := range ports {
		if port.OperationID == operationId &&
			port.Username == username &&
			port.Password == password &&
			port.LocalPort == localPort {
			if remoteIP != "" && remotePort != 0 && (remoteIP != port.RemoteIP || remotePort != port.RemotePort) {
				continue
			}
			return port
		}
	}
	return nil
}
func (c *callbackPortsInUse) ListenForNewByteTransferUpdates() {
	ticker := time.NewTicker(callbackPortByteFlushInterval)
	defer ticker.Stop()
	defer func() {
		logging.LogError(nil, "no longer listening for new byte transfer updates")
	}()
	for range ticker.C {
		c.flushChangedByteCounters()
	}
}

func updateCallbackPortStats(field string, value int64, callbackPortID int) bool {
	if callbackPortID <= 0 {
		return false
	}
	updatedValue := clampCallbackPortByteCount(value)
	_, err := database.DB.Exec(fmt.Sprintf("UPDATE callbackport SET %s=$1 WHERE id=$2",
		field), updatedValue, callbackPortID)
	if err != nil {
		logging.LogError(err, "Failed to update callback port stats")
		return false
	}
	return true
}
func (c *callbackPortsInUse) ListenForProxyFromAgentMessage(channel <-chan ProxyFromAgentMessageForMythic) {
	for agentMessage := range channel {
		c.routeProxyFromAgentMessage(agentMessage)
	}
}

func (c *callbackPortsInUse) routeProxyFromAgentMessage(agentMessage ProxyFromAgentMessageForMythic) {
	switch agentMessage.PortType {
	case CALLBACK_PORT_TYPE_RPORTFWD:
		fallthrough
	case CALLBACK_PORT_TYPE_SOCKS:
		for j := 0; j < len(agentMessage.Messages); j++ {
			port := c.getPortForCallbackTypeAndLocalPort(agentMessage.CallbackID, agentMessage.PortType, agentMessage.Messages[j].Port)
			if port == nil {
				continue
			}
			port.messagesFromAgent <- agentMessage.Messages[j]
		}
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		port := c.getPortForCallbackTypeAndLocalPort(agentMessage.CallbackID, agentMessage.PortType, 0)
		if port != nil {
			for j := 0; j < len(agentMessage.InteractiveMessages); j++ {
				port.interactiveMessagesFromAgent <- agentMessage.InteractiveMessages[j]
			}
			handleAgentMessagePostResponseInteractiveOutput(&agentMessage.InteractiveMessages)
		} else {
			go handleAgentMessagePostResponseInteractiveOutput(&agentMessage.InteractiveMessages)
		}
	}
}
func (c *callbackPortsInUse) GetNextAvailableLocalPort() uint32 {
	exposedPorts := append([]uint32(nil), utils.MythicConfig.ServerDynamicPorts...)
	sort.Slice(exposedPorts, func(i, j int) bool {
		return exposedPorts[i] < exposedPorts[j]
	})
	for _, port := range exposedPorts {
		if !c.IsPortInUse(port) {
			return port
		}
	}
	return 0
}
func (c *callbackPortsInUse) IsPortInUse(port uint32) bool {
	c.RLock()
	defer c.RUnlock()
	for _, currentPort := range c.ports {
		switch currentPort.PortType {
		case CALLBACK_PORT_TYPE_RPORTFWD:
			// rpfwd doesn't bind a port on Mythic, so the ports don't count here
			continue
		case CALLBACK_PORT_TYPE_SOCKS:
			fallthrough
		case CALLBACK_PORT_TYPE_INTERACTIVE:
			if uint32(currentPort.LocalPort) == port {
				return true
			}
		}
	}
	return false
}
func (c *callbackPortsInUse) GetPortForTypeAndCallback(taskId int, callbackId int, portType CallbackPortType) int {
	ports := c.getPortsForCallbackAndType(callbackId, portType)
	for _, port := range ports {
		switch portType {
		case CALLBACK_PORT_TYPE_SOCKS:
			return port.LocalPort
		case CALLBACK_PORT_TYPE_RPORTFWD:
			fallthrough
		case CALLBACK_PORT_TYPE_INTERACTIVE:
			if port.TaskID == taskId {
				return port.LocalPort
			}
		}

	}
	return 0
}
func (c *callbackPortsInUse) GetDataForCallbackIdPortType(callbackId int, portType CallbackPortType) (interface{}, error) {
	proxyData, err := c.getDataForCallbackIdPortTypes(callbackId, []CallbackPortType{portType})
	if err != nil {
		return nil, err
	}
	switch portType {
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		if len(proxyData.Interactive) > 0 {
			return proxyData.Interactive, nil
		}
	case CALLBACK_PORT_TYPE_SOCKS:
		if len(proxyData.Socks) > 0 {
			return proxyData.Socks, nil
		}
	case CALLBACK_PORT_TYPE_RPORTFWD:
		if len(proxyData.Rpfwd) > 0 {
			return proxyData.Rpfwd, nil
		}
	}

	return nil, nil
}

func (c *callbackPortsInUse) GetDataForCallbackIdAllTypes(callbackId int) (callbackProxyData, error) {
	return c.getDataForCallbackIdPortTypes(callbackId, []CallbackPortType{
		CALLBACK_PORT_TYPE_SOCKS,
		CALLBACK_PORT_TYPE_RPORTFWD,
		CALLBACK_PORT_TYPE_INTERACTIVE,
	})
}

func (c *callbackPortsInUse) getDataForCallbackIdPortTypes(callbackId int, portTypes []CallbackPortType) (callbackProxyData, error) {
	proxyData := callbackProxyData{}
	portsByType := c.getPortsWithPendingDataForCallbackByType(callbackId, portTypes)
	for _, portType := range portTypes {
		ports := portsByType[portType]
		switch portType {
		case CALLBACK_PORT_TYPE_INTERACTIVE:
			for _, port := range ports {
				proxyData.Interactive = append(proxyData.Interactive, port.GetData().([]agentMessagePostResponseInteractive)...)
			}
			if len(ports) == 0 && submittedTasksAwaitingFetching.hasInteractiveTasksForCallbackId(callbackId) {
				newInteractiveData, err := handleAgentMessageGetInteractiveTasking(callbackId)
				if err != nil {
					logging.LogError(err, "Failed to fetch interactive tasks")
				} else {
					proxyData.Interactive = append(proxyData.Interactive, newInteractiveData...)
				}
			}
		case CALLBACK_PORT_TYPE_SOCKS:
			for _, port := range ports {
				proxyData.Socks = append(proxyData.Socks, port.GetData().([]proxyToAgentMessage)...)
			}
		case CALLBACK_PORT_TYPE_RPORTFWD:
			for _, port := range ports {
				proxyData.Rpfwd = append(proxyData.Rpfwd, port.GetData().([]proxyToAgentMessage)...)
			}
		}
	}
	return proxyData, nil
}

func (d callbackProxyData) AddToResponse(response map[string]interface{}) {
	if len(d.Socks) > 0 {
		response[CALLBACK_PORT_TYPE_SOCKS] = d.Socks
	}
	if len(d.Rpfwd) > 0 {
		response[CALLBACK_PORT_TYPE_RPORTFWD] = d.Rpfwd
	}
	if len(d.Interactive) > 0 {
		response[CALLBACK_PORT_TYPE_INTERACTIVE] = d.Interactive
	}
}

func (c *callbackPortsInUse) sendProxyFromAgentMessage(message ProxyFromAgentMessageForMythic) {
	c.RLock()
	channels := c.proxyFromAgentMessageChannels
	if len(channels) > 0 {
		channel := channels[proxyFromAgentMessageShard(message.CallbackID, len(channels))]
		c.RUnlock()
		channel <- message
		return
	}
	c.RUnlock()
	// Tests and partially initialized registries may not have listener channels.
	// Route synchronously in that case instead of blocking on a nil channel.
	c.routeProxyFromAgentMessage(message)
}

func (c *callbackPortsInUse) SendDataToCallbackIdPortType(callbackId int, portType CallbackPortType, messages []proxyFromAgentMessage) {
	c.sendProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID: callbackId,
		PortType:   portType,
		Messages:   messages,
	})
}
func (c *callbackPortsInUse) SendInteractiveDataToCallbackIdPortType(callbackId int, portType CallbackPortType, messages []agentMessagePostResponseInteractive) {
	c.sendProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID:          callbackId,
		PortType:            portType,
		InteractiveMessages: messages,
	})
}
func (c *callbackPortsInUse) GetOtherCallbackIds(callbackId int) []int {
	callbackIds := []int{}
	c.RLock()
	defer c.RUnlock()
	if c.portsByCallbackID == nil {
		callbackIDMap := make(map[int]bool)
		for _, port := range c.ports {
			if port.CallbackID != callbackId && !callbackIDMap[port.CallbackID] {
				callbackIDMap[port.CallbackID] = true
				callbackIds = append(callbackIds, port.CallbackID)
			}
		}
		return callbackIds
	}
	for _, currentCallbackID := range c.callbacksWithPorts {
		if currentCallbackID != callbackId {
			callbackIds = append(callbackIds, currentCallbackID)
		}
	}
	return callbackIds
}

// GetOtherCallbackIdsWithPendingData returns other callbacks that have proxy
// data worth routing through delegates. This keeps the delegate path from doing
// BFS work for idle proxy ports while still preserving interactive tasking,
// which is delivered through this same proxy/delegate response path.
func (c *callbackPortsInUse) GetOtherCallbackIdsWithPendingData(callbackId int) []int {
	var candidateCallbackIds []int
	var pendingCallbackIds map[int]bool
	markPendingCallbackId := func(currentCallbackID int) {
		if pendingCallbackIds == nil {
			pendingCallbackIds = make(map[int]bool)
		}
		pendingCallbackIds[currentCallbackID] = true
	}

	c.RLock()
	if c.portsByCallbackID == nil {
		callbackPortsByID := make(map[int][]*callbackPortUsage)
		for _, port := range c.ports {
			if port.CallbackID == callbackId {
				continue
			}
			if len(callbackPortsByID[port.CallbackID]) == 0 {
				candidateCallbackIds = append(candidateCallbackIds, port.CallbackID)
			}
			callbackPortsByID[port.CallbackID] = append(callbackPortsByID[port.CallbackID], port)
		}
		for _, currentCallbackID := range candidateCallbackIds {
			if callbackPortUsagesHavePendingData(callbackPortsByID[currentCallbackID]) {
				markPendingCallbackId(currentCallbackID)
			}
		}
	} else {
		for _, currentCallbackID := range c.callbacksWithPorts {
			if currentCallbackID == callbackId {
				continue
			}
			candidateCallbackIds = append(candidateCallbackIds, currentCallbackID)
			if callbackPortUsagesHavePendingData(c.portsByCallbackID[currentCallbackID]) {
				markPendingCallbackId(currentCallbackID)
			}
		}
	}
	c.RUnlock()

	callbackIdsWithInteractiveTasks := submittedTasksAwaitingFetching.getCallbackIdsWithInteractiveTasks(candidateCallbackIds)
	callbackIds := make([]int, 0, len(pendingCallbackIds)+len(callbackIdsWithInteractiveTasks))
	for _, currentCallbackID := range candidateCallbackIds {
		if pendingCallbackIds[currentCallbackID] || callbackIdsWithInteractiveTasks[currentCallbackID] {
			callbackIds = append(callbackIds, currentCallbackID)
		}
	}
	return callbackIds
}
func (c *callbackPortsInUse) GetDataForCallbackId(callbackId int, portType string) (interface{}, error) {
	return c.GetDataForCallbackIdPortType(callbackId, portType)
}
func (c *callbackPortsInUse) Add(callbackId int, portType CallbackPortType, localPort int, remotePort int,
	remoteIP string, taskId int, operationId int, bytesSentToAgent int64, bytesReceivedFromAgent int64,
	callbackPortID int, username string, password string) error {
	newPort := callbackPortUsage{
		CallbackPortID:               callbackPortID,
		CallbackID:                   callbackId,
		TaskID:                       taskId,
		LocalPort:                    localPort,
		RemotePort:                   remotePort,
		RemoteIP:                     remoteIP,
		OperationID:                  operationId,
		PortType:                     portType,
		Username:                     username,
		Password:                     password,
		messagesToAgent:              make(chan proxyToAgentMessage, 1000),
		newConnectionChannel:         make(chan *acceptedConnection, 1000),
		removeConnectionsChannel:     make(chan *acceptedConnection, 1000),
		messagesFromAgent:            make(chan proxyFromAgentMessage, 1000),
		interactiveMessagesToAgent:   make(chan agentMessagePostResponseInteractive, 1000),
		interactiveMessagesFromAgent: make(chan agentMessagePostResponseInteractive, 1000),
		stopAllConnections:           make(chan bool),
	}
	if callbackPortID > 0 {
		newPort.initializeByteCounters(bytesSentToAgent, bytesReceivedFromAgent)
	} else {
		newPort.initializeByteCounters(0, 0)
	}
	acceptedConnections := make([]*acceptedConnection, 0)
	newPort.acceptedConnections = &acceptedConnections
	callbackPort := databaseStructs.Callbackport{}
	err := database.DB.Get(&callbackPort.Callback.DisplayID, `SELECT display_id FROM callback WHERE id=$1`, newPort.CallbackID)
	if err != nil {
		logging.LogError(err, "Failed to get callback information for new proxy port")
	} else {
		newPort.CallbackDisplayID = callbackPort.Callback.DisplayID
	}
	err = newPort.Start()
	if err != nil {
		logging.LogError(err, "Failed to start new proxy port")
		return err
	}
	err = database.DB.Get(&callbackPort, `SELECT id, bytes_sent, bytes_received FROM callbackport WHERE
                                operation_id=$1 AND callback_id=$2 AND local_port=$3 AND port_type=$4
                                AND remote_ip=$5 AND remote_port=$6 AND username=$7 AND password=$8`,
		operationId, callbackId, localPort, portType, remoteIP, remotePort, username, password)
	if errors.Is(err, sql.ErrNoRows) {
		statement, err := database.DB.PrepareNamed(`INSERT INTO callbackport 
		(task_id, operation_id, callback_id, local_port, port_type, remote_port, remote_ip, username, password)
		VALUES (:task_id, :operation_id, :callback_id, :local_port, :port_type, :remote_port, :remote_ip, :username, :password)
		RETURNING id`)
		if err != nil {
			logging.LogError(err, "Failed to prepare new named statement for callbackports")
			if err := newPort.Stop(); err != nil {
				logging.LogError(err, "Failed to stop new callback port")
			}
			return err
		}
		err = statement.Get(&newPort.CallbackPortID, &newPort)
		if err != nil {
			logging.LogError(err, "Failed to insert new callback port")
			if err := newPort.Stop(); err != nil {
				logging.LogError(err, "Failed to stop new callback port")
			}
			return err
		}
	} else if err == nil {
		_, err = database.DB.NamedExec(`UPDATE callbackport SET deleted=false WHERE id=:id`, callbackPort)
		newPort.CallbackPortID = callbackPort.ID
		if callbackPortID <= 0 {
			newPort.applyPersistedByteCounters(callbackPort.BytesSent, callbackPort.BytesReceived)
		}
	} else {
		logging.LogError(err, "Failed to create new callback port mapping")
		if err := newPort.Stop(); err != nil {
			logging.LogError(err, "Failed to stop new callback port")
		}
		return err
	}
	c.Lock()
	c.addPortLocked(&newPort)
	c.Unlock()
	return nil

}
func (c *callbackPortsInUse) Test(callbackId int, portType CallbackPortType, localPort int, remotePort int,
	remoteIP string, operationId int, callbackPortID int) error {
	switch portType {
	case CALLBACK_PORT_TYPE_RPORTFWD:
		go func() {
			if !canReachRemoteHost(remoteIP, remotePort) {
				err := errors.New(fmt.Sprintf("Testing remote connection for rpfwd:\nfailed to reach remote host, %s:%d", remoteIP, remotePort))
				go SendAllOperationsMessage(err.Error(), operationId, "", database.MESSAGE_LEVEL_INFO, false)
			} else {
				go SendAllOperationsMessage(fmt.Sprintf("Testing remote connection for rpfwd:\nsuccessfully connected to remote host, %s:%d", remoteIP, remotePort),
					operationId, "", database.MESSAGE_LEVEL_INFO, false)
			}
		}()
	default:
		return errors.New("no testing capability for that kind of port")
	}
	return nil

}
func (c *callbackPortsInUse) Remove(callbackId int, portType CallbackPortType, localPort int, operationId int, remoteIP string, remotePort int,
	username string, password string) error {
	port := c.findPortForRemoval(callbackId, portType, localPort, operationId, remoteIP, remotePort, username, password)
	if port == nil {
		return nil
	}
	err := port.Stop()
	if err != nil {
		logging.LogError(err, "Failed to stop proxy")
		return err
	}
	port.flushByteCounters()
	queryString := `UPDATE callbackport SET deleted=true WHERE id=$1`
	queryArgs := []interface{}{port.CallbackPortID}
	_, err = database.DB.Exec(queryString, queryArgs...)
	if err != nil {
		logging.LogError(err, "Failed to delete port mapping from database for proxy")
		return err
	}
	c.Lock()
	c.removePortLocked(port)
	c.Unlock()
	return nil
}
func isPortExposedThroughDocker(portToCheck int) bool {
	if utils.MythicConfig.ServerDockerNetworking == "host" {
		// all ports are exposed if we're doing host networking
		return true
	}
	for _, port := range utils.MythicConfig.ServerDynamicPorts {
		if port == uint32(portToCheck) {
			return true
		}
	}
	return false
}
func canReachRemoteHost(remoteIP string, remotePort int) bool {
	d := net.Dialer{Timeout: 5 * time.Second}
	conn, err := d.Dial("tcp", fmt.Sprintf("%s:%d", remoteIP, remotePort))
	if err != nil {
		logging.LogError(err, "Failed to connect to remote for rpfwd", "remote_ip", remoteIP, "remote port", remotePort)
		return false
	}
	conn.Close()
	return true

}
func (p *callbackPortUsage) Start() error {
	switch p.PortType {
	case CALLBACK_PORT_TYPE_SOCKS:
		if isPortExposedThroughDocker(p.LocalPort) {
			addr := fmt.Sprintf("0.0.0.0:%d", p.LocalPort)
			// bind to 127.0.0.1 if we're doing host networking and asked dynamic ports to bind locally
			if utils.MythicConfig.ServerDockerNetworking == "host" && utils.MythicConfig.ServerDynamicPortsBindLocalhostOnly {
				addr = fmt.Sprintf("127.0.0.1:%d", p.LocalPort)
			}
			l, err := net.Listen("tcp4", addr)
			if err != nil {
				logging.LogError(err, "Failed to start listening on new port")
				go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_INFO, true)
				return err
			}
			p.listener = &l
			go p.handleSocksConnections()
			go p.manageConnections()
			go SendAllOperationsMessage(fmt.Sprintf("Opened %s for %s on Mythic server for Callback %d", addr, p.PortType, p.CallbackDisplayID),
				p.OperationID, "", database.MESSAGE_LEVEL_INFO, false)
		} else {
			err := errors.New(fmt.Sprintf("Failed to start listening on port %d, it's not exposed through docker", p.LocalPort))
			logging.LogError(err, "Can't start listening")
			go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_INFO, true)
			return err
		}
	case CALLBACK_PORT_TYPE_RPORTFWD:
		// start managing incoming/outgoing connections
		go p.manageConnections()
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		if isPortExposedThroughDocker(p.LocalPort) {
			addr := fmt.Sprintf("0.0.0.0:%d", p.LocalPort)
			if utils.MythicConfig.ServerDockerNetworking == "host" && utils.MythicConfig.ServerDynamicPortsBindLocalhostOnly {
				addr = fmt.Sprintf("127.0.0.1:%d", p.LocalPort)
			}
			l, err := net.Listen("tcp4", addr)
			if err != nil {
				logging.LogError(err, "Failed to start listening on new port")
				go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_INFO, true)
				return err
			}
			p.listener = &l
			go p.handleInteractiveConnections()
			go p.manageConnections()
			go SendAllOperationsMessage(fmt.Sprintf("Opened %s for %s on Mythic server for Callback %d", addr, p.PortType, p.CallbackDisplayID),
				p.OperationID, "", database.MESSAGE_LEVEL_INFO, false)

		} else {
			err := errors.New(fmt.Sprintf("Failed to start listening on port %d, it's not exposed through docker", p.LocalPort))
			logging.LogError(err, "Can't start listening")
			go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_INFO, true)
			return err
		}
	default:
		return errors.New("unknown proxy type")
	}
	return nil

}
func (p *callbackPortUsage) Stop() error {
	if p.listener != nil {
		if err := (*p.listener).Close(); err != nil {
			if errors.Is(err, net.ErrClosed) {
				logging.LogInfo("tasking to stop all connections via channel")
				select {
				case p.stopAllConnections <- true:
				default:
				}

				return nil
			}
			logging.LogError(err, "Error calling close for the listener in the Stop function")
			select {
			case p.stopAllConnections <- true:
			default:
			}
			return err
		}
		logging.LogInfo("tasking to stop all connections via channel")
		select {
		case p.stopAllConnections <- true:
		default:
		}
		return nil
	} else {
		logging.LogInfo("tasking to stop all connections via channel")
		select {
		case p.stopAllConnections <- true:
		default:
		}
		return nil
	}

}
func (p *callbackPortUsage) GetData() interface{} {
	switch p.PortType {
	case CALLBACK_PORT_TYPE_SOCKS:
		fallthrough
	case CALLBACK_PORT_TYPE_RPORTFWD:
		return p.GetProxyData()
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		return p.GetInteractiveData()
	}
	return nil
}
func (p *callbackPortUsage) GetProxyData() []proxyToAgentMessage {
	if !p.hasPendingProxyDataForAgent() {
		return nil
	}
	messagesToSendToAgent := make([]proxyToAgentMessage, len(p.messagesToAgent))
	for i := 0; i < len(messagesToSendToAgent); i++ {
		select {
		case messagesToSendToAgent[i] = <-p.messagesToAgent:
			decrementPositiveAtomicCounter(&p.pendingMessagesToAgent)
			//logging.LogDebug("Agent picking up msg from Mythic", "serverID", messagesToSendToAgent[i].ServerID, "exit", messagesToSendToAgent[i].IsExit)
		default:
			//logging.LogDebug("returning set of messages to agent from Mythic", "msgs", messagesToSendToAgent)
			// this is in case we run out of messages for some reason
			return messagesToSendToAgent
		}
	}
	return messagesToSendToAgent
}
func (p *callbackPortUsage) GetInteractiveData() []agentMessagePostResponseInteractive {
	if !p.hasPendingInteractiveDataForAgent() && !submittedTasksAwaitingFetching.hasInteractiveTasksForCallbackId(p.CallbackID) {
		return nil
	}
	messagesToSendToAgent := make([]agentMessagePostResponseInteractive, len(p.interactiveMessagesToAgent))
	for i := 0; i < len(messagesToSendToAgent); i++ {
		select {
		case messagesToSendToAgent[i] = <-p.interactiveMessagesToAgent:
			decrementPositiveAtomicCounter(&p.pendingInteractiveMessagesToAgent)
			//logging.LogDebug("Got message from Mythic to agent", "TaskID", messagesToSendToAgent[i].TaskUUID)
		default:
			//logging.LogDebug("returning set of messages to agent from Mythic", "msgs", messagesToSendToAgent)
			// this is in case we run out of messages for some reason
			return messagesToSendToAgent
		}
	}
	if interactiveData, err := handleAgentMessageGetInteractiveTasking(p.CallbackID); err != nil {
		logging.LogError(err, "Failed to get interactive tasking data")
	} else if interactiveData != nil {
		messagesToSendToAgent = append(messagesToSendToAgent, interactiveData...)
	}
	return messagesToSendToAgent
}
func (p *callbackPortUsage) manageConnections() {
	connectionMap := map[uint32]*acceptedConnection{}
	defer func() {
		logging.LogError(nil, "exiting manageConnections")
	}()
	for {
		//logging.LogInfo("in Manage connection, starting loop")
		select {
		case newConn := <-p.newConnectionChannel:
			//logging.LogInfo("adding new connection channel in manageConnections")
			if _, exists := connectionMap[newConn.ServerID]; exists {
				//logging.LogWarning("Got a new connection with a ServerID that already exists, aborting it")
				select {
				case newConn.shouldClose <- true:
				default:
				}
				if newConn.conn != nil {
					newConn.conn.Close()
				}
				if newConn.udpListener != nil {
					logging.LogInfo("about to close udpListener")
					(*newConn.udpListener).Close()
				}
				if newConn.TaskUUID != nil {
					close(newConn.interactiveMessagesFromAgent)
				} else {
					close(newConn.messagesFromAgent)
				}
				continue
			}
			//logging.LogDebug("adding new connection", "serverID", newConn.ServerID)
			connectionMap[newConn.ServerID] = newConn
		case removeCon := <-p.removeConnectionsChannel:
			//logging.LogDebug("removing connection channel", "serverID", removeCon.ServerID)
			if removeCon.TaskUUID != nil {
				// remove all connections for interactive task
				closeIDs := []uint32{}
				for serverID, _ := range connectionMap {
					if connectionMap[serverID].TaskUUID != nil && connectionMap[serverID].TaskUUID == removeCon.TaskUUID {
						select {
						case connectionMap[serverID].shouldClose <- true:
						default:
						}
						close(connectionMap[serverID].interactiveMessagesFromAgent)
						connectionMap[serverID].conn.Close()
						closeIDs = append(closeIDs, serverID)
					}
				}
				for _, serverID := range closeIDs {
					delete(connectionMap, serverID)
				}
			} else {
				if _, ok := connectionMap[removeCon.ServerID]; ok {
					select {
					case connectionMap[removeCon.ServerID].shouldClose <- true:
					default:
					}
					close(connectionMap[removeCon.ServerID].messagesFromAgent)
					if connectionMap[removeCon.ServerID].conn != nil {
						connectionMap[removeCon.ServerID].conn.Close()
					}

					if connectionMap[removeCon.ServerID].udpListener != nil {
						logging.LogInfo("about to close udpListener")
						(*connectionMap[removeCon.ServerID].udpListener).Close()
					}
					delete(connectionMap, removeCon.ServerID)
					if !removeCon.AgentClosedConnection {
						// we're closing the connection, not the agent, so tell the agent to close
						//logging.LogDebug("Telling agent to remove connection", "serverID", removeCon.ServerID)
						select {
						case interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
							Message: proxyToAgentMessage{
								Message:  nil,
								IsExit:   true,
								ServerID: removeCon.ServerID,
								Port:     p.LocalPort,
							},
							CallbackPort: p,
							ProxyType:    p.PortType,
							CallbackID:   p.CallbackID,
						}:
						default:
						}
					}
				}
			}

		case newMsg := <-p.messagesFromAgent:
			switch p.PortType {
			case CALLBACK_PORT_TYPE_SOCKS:
				//logging.LogInfo("got message from agent in p.messagesFromAgent", "chan", newMsg.ServerID)
				if _, ok := connectionMap[newMsg.ServerID]; ok {
					//logging.LogInfo("got msg from agent for server mythic still thinks is alive", "serverID", newMsg.ServerID, "exit", newMsg.IsExit)
					select {
					case connectionMap[newMsg.ServerID].messagesFromAgent <- newMsg:
					default:
					}
					//logging.LogInfo("send message along to acceptedConnection's messagesFromAgent", "chan", newMsg.ServerID)
				} else if !newMsg.IsExit {
					// we don't have knowledge of this ServerID and this isn't an "IsExit" message, so tell the other end to close
					/*
						interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
							Message: proxyToAgentMessage{
								Message:  nil,
								IsExit:   true,
								ServerID: newMsg.ServerID,
								Port:     p.LocalPort,
							},
							CallbackPort: p,
							ProxyType:    p.PortType,
							CallbackID:   p.CallbackID,
						}

					*/
				} else {
					//logging.LogInfo("unknown server id in connections map for messagesFromAgent", "serverID", newMsg.ServerID)
				}
			case CALLBACK_PORT_TYPE_RPORTFWD:
				//logging.LogInfo("got message from agent in p.messagesFromAgent", "chan", newMsg.ServerID)
				if _, ok := connectionMap[newMsg.ServerID]; ok {
					//logging.LogInfo("found supporting connection in connection map", "chan", newMsg.ServerID)
					// this means that we've seen this ServerID before, established a remote connection, and are just sending more data
					select {
					case connectionMap[newMsg.ServerID].messagesFromAgent <- newMsg:
					default:
					}
					//logging.LogInfo("send message along to acceptedConnection's messagesFromAgent", "chan", newMsg.ServerID)
				} else {
					// got a new serverID from the agent that we aren't tracking, so we need to make a new connection
					d := net.Dialer{Timeout: 5 * time.Second}
					conn, err := d.Dial("tcp", fmt.Sprintf("%s:%d", p.RemoteIP, p.RemotePort))
					if err != nil {
						logging.LogError(err, "Failed to connect to remote for rpfwd", "remote_ip", p.RemoteIP, "remote port", p.RemotePort, "server_id", newMsg.ServerID)
						interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
							Message: proxyToAgentMessage{
								Message:  nil,
								IsExit:   true,
								ServerID: newMsg.ServerID,
								Port:     p.LocalPort,
							},
							CallbackPort: p,
							CallbackID:   p.CallbackID,
							ProxyType:    p.PortType,
						}
						go SendAllOperationsMessage(fmt.Sprintf("Failed to connect to %s:%d for new rpfwd message", p.RemoteIP, p.RemotePort),
							p.OperationID, "rpfwd", database.MESSAGE_LEVEL_INFO, true)
					} else {
						// we have a valid connection to the remote server
						// Handle connections in a new goroutine
						logging.LogDebug("got new connection for rpfwd", "server_id", newMsg.ServerID)
						newConnection := acceptedConnection{
							conn:              conn,
							shouldClose:       make(chan bool, 1),
							messagesFromAgent: make(chan proxyFromAgentMessage, 1000),
							ServerID:          newMsg.ServerID, // randomized id
							port:              p.LocalPort,
						}
						//p.newConnectionChannel <- &newConnection
						// using the channel like normal might cause a race condition with processing the next message from the agent
						connectionMap[newConnection.ServerID] = &newConnection
						//logging.LogInfo("made new connection to remote ip/port, about to handle connections")
						go p.handleRpfwdConnections(&newConnection)
						select {
						case newConnection.messagesFromAgent <- newMsg:
						default:
						}
					}
				}
			default:

			}
		case newMsg := <-p.interactiveMessagesFromAgent:
			// find all connections for the specified task uuid
			for serverID, _ := range connectionMap {
				if connectionMap[serverID].TaskUUID != nil && *connectionMap[serverID].TaskUUID == newMsg.TaskUUID {
					connectionMap[serverID].interactiveMessagesFromAgent <- newMsg
				}
			}

		case <-p.stopAllConnections:
			for _, rmProxyData := range connectionMap {
				select {
				case rmProxyData.shouldClose <- true:
				default:
				}
				if rmProxyData.TaskUUID != nil {
					close(rmProxyData.interactiveMessagesFromAgent)
				} else {
					close(rmProxyData.messagesFromAgent)
				}
				if rmProxyData.conn != nil {
					rmProxyData.conn.Close()
				}
				delete(connectionMap, rmProxyData.ServerID)
			}
			go SendAllOperationsMessage(fmt.Sprintf("Stopped port %d for %s on Mythic server for Callback %d", p.LocalPort, p.PortType, p.CallbackDisplayID),
				p.OperationID, "", database.MESSAGE_LEVEL_INFO, false)
			continue
			//case <-time.After(10 * time.Second):
			//logging.LogError(nil, "1s timeout, re-looping", "p.newConnectionChannel", len(p.newConnectionChannel),
			//	"p.removeConnectionsChannel", len(p.removeConnectionsChannel),
			//	"p.messagesFromAgent", len(p.messagesFromAgent))
		}
		//logging.LogInfo("in Manage connection, finished loop")
	}
}
func (p *callbackPortUsage) socksUsernamePasswordAuthCheck(conn net.Conn) bool {
	versionAndUsernameLength := make([]byte, 2)
	_, err := conn.Read(versionAndUsernameLength)
	//logging.LogInfo("version and username bytes", "bytes", versionAndUsernameLength)
	if err != nil {
		logging.LogError(err, "failed to read version and username length bytes")
		return false
	}
	if versionAndUsernameLength[0] != '\x01' {
		logging.LogError(nil, "version isn't supported for auth, should be 0x01")
		_, err = conn.Write([]byte{'\x01', '\x01'})
		if err != nil {
			logging.LogError(err, "Failed to send the \\x05\\x00 no-auth bytes for new socks connection")
			return false
		}
		return false
	}
	clientUsername := make([]byte, versionAndUsernameLength[1])
	_, err = conn.Read(clientUsername)
	if err != nil {
		logging.LogError(err, "failed to read username bytes")
		return false
	}
	logging.LogInfo("username", "bytes", clientUsername)
	passwordLength := make([]byte, 1)
	_, err = conn.Read(passwordLength)
	if err != nil {
		logging.LogError(err, "failed to read password length bytes")
		return false
	}
	clientPassword := make([]byte, passwordLength[0])
	_, err = conn.Read(clientPassword)
	if err != nil {
		logging.LogError(err, "failed to read password bytes")
		return false
	}
	if string(clientUsername) != p.Username {
		logging.LogError(nil, "Username mismatch")
		_, err = conn.Write([]byte{'\x01', '\x01'})
		go SendAllOperationsMessage(
			fmt.Sprintf("failed username (%s) auth to socks port %d from %s",
				string(clientUsername), p.LocalPort, conn.RemoteAddr().String()),
			p.OperationID, fmt.Sprintf("%d_%s_%s", p.LocalPort, p.PortType, string(clientUsername)),
			database.MESSAGE_LEVEL_AUTH, true)
		if err != nil {
			//logging.LogError(err, "Failed to send the \\x01\\x01 bad-auth bytes for new socks connection")
			return false
		}
		return false
	}
	if string(clientPassword) != p.Password {
		logging.LogError(nil, "Invalid Password for socks access")
		_, err = conn.Write([]byte{'\x01', '\x01'})
		go SendAllOperationsMessage(
			fmt.Sprintf("failed password (%s) auth to socks port %d from %s",
				string(clientPassword), p.LocalPort, conn.RemoteAddr().String()),
			p.OperationID, fmt.Sprintf("%d_%s_%s", p.LocalPort, p.PortType, string(clientUsername)),
			database.MESSAGE_LEVEL_AUTH, true)
		if err != nil {
			//logging.LogError(err, "Failed to send the \\x01\\x01 bad-auth bytes for new socks connection")
			return false
		}
		return false
	}
	_, err = conn.Write([]byte{'\x01', '\x00'})
	if err != nil {
		//logging.LogError(err, "Failed to send the \\x01\\x00 good-auth bytes for new socks connection")
		return false
	}
	return true
}

const Socks5Version = '\x05'
const Socks5NoAuth = '\x00'
const Socks5UsernamePasswordAuth = '\x02'
const Socks5CmdConnect = '\x01'
const Socks5CmdBind = '\x02'
const Socks5CmdUdpAssociate = '\x03'
const Socks5AtypIPV4 = '\x01'
const Socks5AtypDomainName = '\x03'
const Socks5AtypIPV6 = '\x04'
const Socks5ReplySucceeded = '\x00'
const Socks5ReplyGeneralFailure = '\x01'
const Socks5ReplyConnectionNotAllowed = '\x02'

var Socks5UnrecognizedAddrType = fmt.Errorf("unrecognized address type")
var Socks5StartNoAuth = []byte{'\x05', '\x00'}
var Socks5StartUsernamePasswordAuth = []byte{'\x05', '\x02'}

// maxAllocSize is 100KB
const maxAllocSize = 1024 * 100
const minAllocSize = 1024

func (p *callbackPortUsage) burstAdjustReadSize(lastReads []int, currentLimit int) int {
	if lastReads[0] == 0 {
		return currentLimit
	}
	if lastReads[0] == lastReads[1] && lastReads[1] == lastReads[2] && lastReads[0] == currentLimit {
		newLimit := currentLimit * 2
		if newLimit > maxAllocSize {
			newLimit = maxAllocSize
		}
		return newLimit
	}
	if lastReads[0] == lastReads[1] && lastReads[1] > lastReads[2] {
		return currentLimit
	}
	if lastReads[0] > lastReads[1] && lastReads[0] > lastReads[2] {
		newLimit := currentLimit / 2
		if newLimit < minAllocSize {
			newLimit = minAllocSize
		}
		return newLimit
	}
	return currentLimit
}

// ***** start section from https://github.com/armon/go-socks5 ********
type AddrSpec struct {
	FQDN string
	IP   net.IP
	Port int
}

func ReadAddrSpec(r io.Reader) (*AddrSpec, error) {
	d := &AddrSpec{}

	// Get the address type
	addrType := []byte{0}
	if _, err := r.Read(addrType); err != nil {
		return nil, err
	}

	// Handle on a per type basis
	//fmt.Printf("addr type case: %v\n", addrType[0])
	switch addrType[0] {
	case Socks5AtypIPV4:
		addr := make([]byte, 4)
		if _, err := io.ReadAtLeast(r, addr, len(addr)); err != nil {
			return nil, err
		}
		d.IP = net.IP(addr)

	case Socks5AtypIPV6:
		addr := make([]byte, 16)
		if _, err := io.ReadAtLeast(r, addr, len(addr)); err != nil {
			return nil, err
		}
		d.IP = net.IP(addr)

	case Socks5AtypDomainName:
		if _, err := r.Read(addrType); err != nil {
			return nil, err
		}
		addrLen := int(addrType[0])
		fqdn := make([]byte, addrLen)
		if _, err := io.ReadAtLeast(r, fqdn, addrLen); err != nil {
			return nil, err
		}
		d.FQDN = string(fqdn)

	default:
		return nil, Socks5UnrecognizedAddrType
	}

	// Read the port
	port := []byte{0, 0}
	if _, err := io.ReadAtLeast(r, port, 2); err != nil {
		return nil, err
	}
	d.Port = (int(port[0]) << 8) | int(port[1])

	return d, nil
}
func (a AddrSpec) Address() string {
	if 0 != len(a.IP) {
		return net.JoinHostPort(a.IP.String(), strconv.Itoa(a.Port))
	}
	return net.JoinHostPort(a.FQDN, strconv.Itoa(a.Port))
}

// ***** end section from https://github.com/armon/go-socks5 ********
func (p *callbackPortUsage) readFromAgentSocksConn(newConnection *acceptedConnection) {
	// function for reading from agents to send to Mythic's connections
	for {
		select {
		case <-newConnection.shouldClose:
			//logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
			//p.removeConnectionsChannel <- &newConnection
			return
		case agentMessage := <-newConnection.messagesFromAgent:
			//logging.LogDebug("Writing to connection from agent", "serverID", agentMessage.ServerID)
			dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Message)
			if err != nil {
				logging.LogError(err, "Failed to base64 decode agent socks message", "server_id", newConnection.ServerID)
				continue
			}
			_, err = newConnection.conn.Write(dataBytes)
			if err != nil {
				logging.LogError(err, "Failed to write to connection", "server_id", newConnection.ServerID)
				p.removeConnectionsChannel <- newConnection
				return
			}
			p.addBytesReceivedFromAgent(int64(len(dataBytes)))

			if agentMessage.IsExit {
				logging.LogDebug("got message from agent isExit", "server_id", newConnection.ServerID)
				// cleanup the connection data, but don't tell the agent to close
				newConnection.AgentClosedConnection = true
				p.removeConnectionsChannel <- newConnection
				return
			}
		}
	}
}
func (p *callbackPortUsage) handleSocksConnections() {
	for {
		// Listen for an incoming connection
		if p.listener == nil {
			logging.LogError(nil, "Listener is nil, exiting the handleSocksConnections loop", "port", p.LocalPort)
			return
		}
		tempConn, err := (*p.listener).Accept()
		if err != nil {
			logging.LogError(err, "Failed to accept new connection on port", "port", p.LocalPort)
			err = (*p.listener).Close()
			if err != nil {
				logging.LogError(err, "Failed to close listener", "port", p.LocalPort)
			}
			//p.listener = nil
			return
		}
		go func(conn net.Conn) {
			// this reads from the connection and writes data for the agent to process
			//	+----+----------+----------+
			//	|VER | NMETHODS | METHODS  |
			//	+----+----------+----------+
			//	| 1  |    1     | 1 to 255 |
			//	+----+----------+----------+
			initial := make([]byte, 2)
			_, err = conn.Read(initial) // should be \x05 followed by the number of Auth methods supported
			if err != nil {
				conn.Close()
				logging.LogError(err, "failed to read initial SOCKS connection data")
				return
			}
			if initial[0] != Socks5Version {
				logging.LogError(nil, "Initial message from SOCKS client didn't say it was SOCKS5")
				return
			}
			authBytes := make([]byte, initial[1])
			_, err = conn.Read(authBytes) // should be a list of supported auth types (\x00, \x01, \0x02, \0x03-\xFF no good)
			if err != nil {
				conn.Close()
				logging.LogError(err, "failed to read auth bytes", "authSize", initial[1])
				return
			}
			if p.Username == "" && p.Password == "" {
				//logging.LogInfo("blank username/password")
				supportsNoAuth := false
				for i, _ := range authBytes {
					if authBytes[i] == Socks5NoAuth {
						supportsNoAuth = true
					}
				}
				if !supportsNoAuth {
					conn.Close()
					logging.LogError(nil, "Client doesn't support no auth (x00), can't communicate")
					return
				}
				_, err = conn.Write(Socks5StartNoAuth)
				if err != nil {
					conn.Close()
					logging.LogError(err, "Failed to send the \\x05\\x00 no-auth bytes for new socks connection")
					return
				}
			} else {
				//logging.LogInfo("needs auth", "username", p.Username, "pass", p.Password)
				supportsUserPasswordAuth := false
				for i, _ := range authBytes {
					if authBytes[i] == Socks5UsernamePasswordAuth {
						supportsUserPasswordAuth = true
					}
				}
				if !supportsUserPasswordAuth {
					conn.Close()
					logging.LogError(nil, "Client doesn't support username/password auth, can't communicate")
					return
				}
				_, err = conn.Write(Socks5StartUsernamePasswordAuth)
				if err != nil {
					conn.Close()
					logging.LogError(err, "Failed to send the \\x05\\x02 user/pass auth bytes for new socks connection")
					return
				}
				if !p.socksUsernamePasswordAuthCheck(conn) {
					conn.Close()
					return
				}
			}
			newConnection := acceptedConnection{
				conn:              conn,
				shouldClose:       make(chan bool, 1),
				messagesFromAgent: make(chan proxyFromAgentMessage, 1000),
				ServerID:          uint32(rand.Intn(math.MaxInt32)), // randomized id
				port:              p.LocalPort,
			}
			p.newConnectionChannel <- &newConnection
			go p.readFromAgentSocksConn(&newConnection)
			go func(conn net.Conn) {
				// function for reading from Mythic's connections to send to agents
				firstRead := true
				lastReadSizes := []int{0, 0, 0}
				tempBufSize := minAllocSize
				for {
					tempBufSize = p.burstAdjustReadSize(lastReadSizes, tempBufSize)
					buf := make([]byte, tempBufSize)
					//logging.LogDebug("looping to read from connection again", "server_id", newConnection.ServerID)
					// add some sleep here to keep things from getting overwhelmed
					time.Sleep(time.Duration(20) * time.Millisecond)
					length, err := conn.Read(buf)
					if length > 0 {
						lastReadSizes[0] = lastReadSizes[1]
						lastReadSizes[1] = lastReadSizes[2]
						lastReadSizes[2] = length
						if firstRead {
							firstRead = false
							// the first message that gets sent has connection information
							// we need to inspect it in case it's a UDP Associate request
							//	+----+-----+-------+------+----------+----------+
							//	|VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
							//	+----+-----+-------+------+----------+----------+
							//	| 1  |  1  | X'00' |  1   | Variable |    2     |
							//	+----+-----+-------+------+----------+----------+
							// replies to this initial message:
							//	+----+-----+-------+------+----------+----------+
							//	|VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
							//	+----+-----+-------+------+----------+----------+
							//	| 1  |  1  | X'00' |  1   | Variable |    2     |
							//	+----+-----+-------+------+----------+----------+
							// version should be Socks5Version
							if buf[0] != Socks5Version {
								p.removeConnectionsChannel <- &newConnection
								return
							}
							switch buf[1] {
							case Socks5CmdConnect:
								// this is handled within the agent, nothing to do
							case Socks5CmdBind:
								// this is handled within the agent, nothing to do
								/*
										The BIND request is used in protocols which require the client to
									   accept connections from the server.  FTP is a well-known example,
									   which uses the primary client-to-server connection for commands and
									   status reports, but may use a server-to-client connection for
									   transferring data on demand (e.g. LS, GET, PUT).

									   It is expected that the client side of an application protocol will
									   use the BIND request only to establish secondary connections after a
									   primary connection is established using CONNECT.  In is expected that
									   a SOCKS server will use DST.ADDR and DST.PORT in evaluating the BIND
									   request.

									   Two replies are sent from the SOCKS server to the client during a
									   BIND operation.  The first is sent after the server creates and binds
									   a new socket.  The BND.PORT field contains the port number that the
									   SOCKS server assigned to listen for an incoming connection.  The
									   BND.ADDR field contains the associated IP address.  The client will
									   typically use these pieces of information to notify (via the primary
									   or control connection) the application server of the rendezvous
									   address.  The second reply occurs only after the anticipated incoming
									   connection succeeds or fails.

								*/
							case Socks5CmdUdpAssociate:
								/*
										The UDP ASSOCIATE request is used to establish an association within
									   the UDP relay process to handle UDP datagrams.  The DST.ADDR and
									   DST.PORT fields contain the address and port that the client expects
									   to use to send UDP datagrams on for the association.  The server MAY
									   use this information to limit access to the association.  If the
									   client is not in possesion of the information at the time of the UDP
									   ASSOCIATE, the client MUST use a port number and address of all
									   zeros.

									   A UDP association terminates when the TCP connection that the UDP
									   ASSOCIATE request arrived on terminates.

									   In the reply to a UDP ASSOCIATE request, the BND.PORT and BND.ADDR
									   fields indicate the port number/address where the client MUST send
									   UDP request messages to be relayed.
								*/
								if utils.MythicConfig.ServerDockerNetworking != "host" {
									logging.LogError(nil, "UDP Associate only for host networking")
									p.removeConnectionsChannel <- &newConnection
									go SendAllOperationsMessage(
										fmt.Sprintf("UDP Associate SOCKS5 connections only avaiable with 'host' networking. Currently in 'bridge' networking."),
										p.OperationID, "udp_associate", database.MESSAGE_LEVEL_INFO, true)
									return
								}
								// buf[2] is reserved to be \x00
								go func() {
									byteReader := bytes.NewReader(buf[3:])
									destination, err := ReadAddrSpec(byteReader)
									if err != nil {
										logging.LogError(err, "Failed to read destination address", "server_id", newConnection.ServerID)
										p.removeConnectionsChannel <- &newConnection
										return
									}
									// check addr and port to see if all 0 or not, if not all 0 use it to limit access to new udp port
									// start listening on udp port
									addr := &net.UDPAddr{
										IP:   net.IPv4(0, 0, 0, 0),
										Port: 0,
										Zone: "",
									}
									// bind to 127.0.0.1 if we're doing host networking and asked dynamic ports to bind locally
									if utils.MythicConfig.ServerDynamicPortsBindLocalhostOnly {
										addr = &net.UDPAddr{
											IP:   net.IPv4(127, 0, 0, 1),
											Port: 0,
											Zone: "",
										}
									}
									udpListener, err := net.ListenUDP("udp", addr)
									if err != nil {
										logging.LogError(err, "Failed to start listening on new port for UDP associate")
										go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_INFO, true)
										p.removeConnectionsChannel <- &newConnection
										return
									}
									newConnection.udpListener = udpListener
									newUDPPort := uint16(udpListener.LocalAddr().(*net.UDPAddr).Port)
									newUDPAddressIPV4 := conn.LocalAddr().(*net.TCPAddr).IP.To4()
									udpAssociateResponse := make([]byte, 10)
									udpAssociateResponse[0] = Socks5Version
									udpAssociateResponse[1] = Socks5ReplySucceeded
									udpAssociateResponse[2] = '\x00'
									udpAssociateResponse[3] = Socks5AtypIPV4
									copy(udpAssociateResponse[4:], newUDPAddressIPV4)
									// have to get the port into the right network octet order
									udpAssociateResponse[8] = byte(newUDPPort >> 8)
									udpAssociateResponse[9] = byte(newUDPPort & 0xff)
									time.Sleep(1 * time.Second)
									// reply back with bnd.port and bind.addr of where to send connection data
									_, err = conn.Write(udpAssociateResponse)
									if err != nil {
										logging.LogError(err, "Failed to send UDP associate message to server", "bytes", udpAssociateResponse)
										p.removeConnectionsChannel <- &newConnection
										return
									}
									/*
										A UDP-based client MUST send its datagrams to the UDP relay server at
										   the UDP port indicated by BND.PORT in the reply to the UDP ASSOCIATE
										   request.  If the selected authentication method provides
										   encapsulation for the purposes of authenticity, integrity, and/or
										   confidentiality, the datagram MUST be encapsulated using the
										   appropriate encapsulation.  Each UDP datagram carries a UDP request
										   header with it:
										      +----+------+------+----------+----------+----------+
										      |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
										      +----+------+------+----------+----------+----------+
										      | 2  |  1   |  1   | Variable |    2     | Variable |
										      +----+------+------+----------+----------+----------+

										     The fields in the UDP request header are:

										          o  RSV  Reserved X'0000'
										          o  FRAG    Current fragment number
										          o  ATYP    address type of following addresses:
										             o  IP V4 address: X'01'
										             o  DOMAINNAME: X'03'
										             o  IP V6 address: X'04'
										          o  DST.ADDR       desired destination address
										          o  DST.PORT       desired destination port
										          o  DATA     user data

										   When a UDP relay server decides to relay a UDP datagram, it does so
										   silently, without any notification to the requesting client.
										   Similarly, it will drop datagrams it cannot or will not relay.  When
										   a UDP relay server receives a reply datagram from a remote host, it
										   MUST encapsulate that datagram using the above UDP request header,
										   and any authentication-method-dependent encapsulation.

										   The UDP relay server MUST acquire from the SOCKS server the expected
										   IP address of the client that will send datagrams to the BND.PORT
										   given in the reply to UDP ASSOCIATE.  It MUST drop any datagrams
										   arriving from any source IP address other than the one recorded for
										   the particular association.

										   The FRAG field indicates whether or not this datagram is one of a
										   number of fragments.  If implemented, the high-order bit indicates
										   end-of-fragment sequence, while a value of X'00' indicates that this
										   datagram is standalone.
									*/
									originatorIP := newConnection.conn.RemoteAddr().(*net.TCPAddr).IP
									for {
										newUDPConnectionBuf := make([]byte, 1024)
										logging.LogInfo("waiting to accept udp connection")
										newUDPConnectionBufLength, tempUDPConn, err := udpListener.ReadFromUDP(newUDPConnectionBuf)
										if err != nil {
											logging.LogError(err, "failed to accept udp connection")
											p.removeConnectionsChannel <- &newConnection
											return
										}
										logging.LogInfo("accepted udp connection")
										if !originatorIP.Equal(tempUDPConn.IP) && destination.IP.String() != "0.0.0.0" {
											// connection rejected
											logging.LogError(nil, "Rejecting UDP connection based on IP connection", "IP", tempUDPConn.String(), "expected IP", destination.IP.String())
											continue
										}
										// connection accepted
										newUDPConnection := acceptedConnection{
											shouldClose:       make(chan bool, 1),
											messagesFromAgent: make(chan proxyFromAgentMessage, 1000),
											ServerID:          uint32(rand.Intn(math.MaxInt32)), // randomized id
											port:              p.LocalPort,
										}
										// track it so we can get the output back to the right addr
										p.newConnectionChannel <- &newUDPConnection
										//logging.LogDebug("got new UDP connection, sending to intercept proxy")
										interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
											Message: proxyToAgentMessage{
												Message:  newUDPConnectionBuf[:newUDPConnectionBufLength],
												IsExit:   false,
												ServerID: newUDPConnection.ServerID,
												Port:     p.LocalPort,
											},
											CallbackPort: p,
											CallbackID:   p.CallbackID,
											ProxyType:    p.PortType,
										}
										p.addBytesSentToAgent(int64(newUDPConnectionBufLength))
										go func(remoteAddr net.Addr) {
											// work on this section!!
											// handle the read from agent and write back out to socket here so we can use the same addr
											for {
												select {
												case <-newUDPConnection.shouldClose:
													//logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
													p.removeConnectionsChannel <- &newUDPConnection
													return
												case agentMessage := <-newUDPConnection.messagesFromAgent:
													//logging.LogDebug("Writing to connection from agent", "serverID", agentMessage.ServerID)
													dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Message)
													if err != nil {
														logging.LogError(err, "Failed to base64 decode agent socks message", "server_id", newUDPConnection.ServerID)
														continue
													}
													_, err = udpListener.WriteTo(dataBytes, remoteAddr)
													if err != nil {
														logging.LogError(err, "Failed to write to connection", "server_id", newUDPConnection.ServerID)
														p.removeConnectionsChannel <- &newUDPConnection
														return
													}
													p.addBytesReceivedFromAgent(int64(len(dataBytes)))

													if agentMessage.IsExit {
														//logging.LogDebug("got message from agent isExit", "server_id", newConnection.ServerID)
														// cleanup the connection data, but don't tell the agent to close
														newUDPConnection.AgentClosedConnection = true
														p.removeConnectionsChannel <- &newUDPConnection
														return
													}
													//logging.LogDebug("new udp message saying to remove")
													interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
														Message: proxyToAgentMessage{
															Message:  nil,
															IsExit:   true,
															ServerID: newUDPConnection.ServerID,
															Port:     p.LocalPort,
														},
														CallbackPort: p,
														CallbackID:   p.CallbackID,
														ProxyType:    p.PortType,
													}
												}
											}
										}(tempUDPConn)
									}
								}()
								continue
							default:
							}
						}
						//logging.LogDebug("Message received from proxychains", "serverID", newConnection.ServerID, "size", length, "sizeLimit", tempBufSize)
						interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
							Message: proxyToAgentMessage{
								Message:  buf[:length],
								IsExit:   err != nil,
								ServerID: newConnection.ServerID,
								Port:     p.LocalPort,
							},
							CallbackPort: p,
							CallbackID:   p.CallbackID,
							ProxyType:    p.PortType,
						}
						p.addBytesSentToAgent(int64(length))
					}
					if err != nil {
						logging.LogError(err, "closing tcp connection")
						if length > 0 {
							// we already indicated for the agent to close, don't send another
							newConnection.AgentClosedConnection = true
						}
						p.removeConnectionsChannel <- &newConnection
						return
					}
				}
			}(conn)
		}(tempConn)

	}
}
func (p *callbackPortUsage) handleRpfwdConnections(newConnection *acceptedConnection) {
	//logging.LogDebug("Got new connection, spinning off read and write", "server_id", newConnection.ServerID)
	go func(conn net.Conn) {
		// function for reading from agents to send to Mythic's connections
		for {
			select {
			case <-newConnection.shouldClose:
				//logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
				//p.removeConnectionsChannel <- newConnection
				return
			case agentMessage := <-newConnection.messagesFromAgent:
				//logging.LogDebug("Writing to connection from agent", "serverID", agentMessage.ServerID)
				dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Message)
				if err != nil {
					logging.LogError(err, "Failed to base64 decode agent socks message", "server_id", newConnection.ServerID)
					continue
				}
				_, err = conn.Write(dataBytes)
				if err != nil {
					logging.LogError(err, "Failed to write to connection", "server_id", newConnection.ServerID)
					p.removeConnectionsChannel <- newConnection
					return
				}
				p.addBytesReceivedFromAgent(int64(len(dataBytes)))
				if agentMessage.IsExit {
					//logging.LogDebug("got message isExit", "server_id", newConnection.ServerID)
					// cleanup the connection data, but don't send an exit back to the agent
					newConnection.AgentClosedConnection = true
					p.removeConnectionsChannel <- newConnection
					return
				}
			}
		}
	}(newConnection.conn)
	go func(conn net.Conn) {
		// function for reading from Mythic's connections to send to agents
		lastReadSizes := []int{0, 0, 0}
		tempBufSize := minAllocSize
		for {
			tempBufSize = p.burstAdjustReadSize(lastReadSizes, tempBufSize)
			buf := make([]byte, tempBufSize)
			//logging.LogDebug("looping to read from connection", "server_id", newConnection.ServerID)
			length, err := conn.Read(buf)
			if length > 0 {
				lastReadSizes[0] = lastReadSizes[1]
				lastReadSizes[1] = lastReadSizes[2]
				lastReadSizes[2] = length
				//logging.LogDebug("Message received for chan %d: length %v\n", newConnection.ServerID, length)
				interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
					Message: proxyToAgentMessage{
						Message:  buf[:length],
						IsExit:   err != nil,
						ServerID: newConnection.ServerID,
						Port:     p.LocalPort,
					},
					CallbackPort: p,
					ProxyType:    p.PortType,
					CallbackID:   p.CallbackID,
				}
				p.addBytesSentToAgent(int64(length))
				//fmt.Printf("Message sent to p.messagesToAgent channel for chan %d\n", newConnection.ServerID)
			}
			if err != nil {
				if err != io.EOF {
					logging.LogError(err, "Failed to read from rpfwd connection, sending exit", "serverID", newConnection.ServerID)
				}
				if length > 0 {
					newConnection.AgentClosedConnection = true
				}
				p.removeConnectionsChannel <- newConnection
				return
			}

		}
	}(newConnection.conn)
}
func (p *callbackPortUsage) handleInteractiveConnections() {
	for {
		// Listen for an incoming connection
		if p.listener != nil {
			if conn, err := (*p.listener).Accept(); err != nil {
				logging.LogError(err, "Failed to accept new connection on port", "port", p.LocalPort)
				if err := (*p.listener).Close(); err != nil {
					logging.LogError(err, "Failed to close listener", "port", p.LocalPort)
				}
				//p.listener = nil
				return
			} else {
				// Handle connections in a new goroutine
				var taskUUID string
				err := database.DB.Get(&taskUUID, `SELECT agent_task_id FROM task WHERE id=$1`, p.TaskID)
				if err != nil {
					logging.LogError(err, "Failed to get task information for new interactive task connection")
					return
				}
				newConnection := acceptedConnection{
					conn:                         conn,
					shouldClose:                  make(chan bool, 1),
					interactiveMessagesFromAgent: make(chan agentMessagePostResponseInteractive, 1000),
					ServerID:                     uint32(rand.Intn(math.MaxInt32)), // randomized id
					TaskUUID:                     &taskUUID,
					port:                         p.LocalPort,
				}
				p.newConnectionChannel <- &newConnection

				//logging.LogDebug("Got new connection", "server_id", newConnection.ServerID)
				go func(conn net.Conn) {
					// function for reading from agents to send to Mythic's connections
					for {
						select {
						case <-newConnection.shouldClose:
							//logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
							//p.removeConnectionsChannel <- &newConnection
							return
						case agentMessage := <-newConnection.interactiveMessagesFromAgent:
							//logging.LogDebug("Writing to connection from agent", "serverID", agentMessage.ServerID)
							dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Data)
							if err != nil {
								logging.LogError(err, "Failed to base64 decode agent interactive message", "server_id", newConnection.ServerID)
								continue
							}
							_, err = conn.Write(dataBytes)
							if err != nil {
								logging.LogError(err, "Failed to write to connection", "server_id", newConnection.ServerID)
								p.removeConnectionsChannel <- &newConnection
								return
							}
							p.addBytesReceivedFromAgent(int64(len(dataBytes)))
							if agentMessage.MessageType == InteractiveTask.Exit {
								//logging.LogDebug("got message isExit", "server_id", newConnection.ServerID)
								// cleanup the connection data
								newConnection.AgentClosedConnection = true
								p.removeConnectionsChannel <- &newConnection
								return
							}

						}
					}

				}(conn)
				go func(conn net.Conn) {
					// function for reading from Mythic's connections to send to agents
					for {
						buf := make([]byte, 4096)
						//logging.LogDebug("looping to read from connection again", "server_id", newConnection.ServerID)
						length, err := conn.Read(buf)
						if err != nil {
							//logging.LogError(err, "Failed to read from connection, sending exit", "server_id", newConnection.ServerID)
							p.removeConnectionsChannel <- &newConnection
							return
						}
						if length > 0 {
							//fmt.Printf("Message received for chan %d: length %v\n", newConnection.ServerID, length)
							interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
								InteractiveMessage: agentMessagePostResponseInteractive{
									Data:        base64.StdEncoding.EncodeToString(buf[:length]),
									TaskUUID:    taskUUID,
									MessageType: 0,
								},
								CallbackPort: p,
								CallbackID:   p.CallbackID,
								ProxyType:    p.PortType,
							}
							p.addBytesSentToAgent(int64(length))
							//fmt.Printf("Message sent to p.messagesToAgent channel for chan %d\n", newConnection.ServerID)
						}

					}

				}(conn)
			}
		} else {
			logging.LogError(nil, "Listener is nil, exiting the handleSocksConnections loop", "port", p.LocalPort)
			return
		}

	}
}
