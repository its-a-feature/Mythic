package rabbitmq

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"io"
	"math"
	"math/rand"
	"net"
	"sort"
	"strconv"
	"time"
)

type CallbackPortType = string

const (
	CALLBACK_PORT_TYPE_SOCKS       CallbackPortType = "socks"
	CALLBACK_PORT_TYPE_RPORTFWD                     = "rpfwd"
	CALLBACK_PORT_TYPE_INTERACTIVE                  = "interactive"
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
type bytesSentToAgentMessage struct {
	CallbackPortID int `json:"id"`
	ByteCount      int64
	Initial        bool
}
type bytesReceivedFromAgentMessage struct {
	CallbackPortID int `json:"id"`
	ByteCount      int64
	Initial        bool
}

type callbackPortUsage struct {
	CallbackPortID             int              `json:"id" db:"id"`
	CallbackID                 int              `json:"callback_id" db:"callback_id"`
	TaskID                     int              `json:"task_id" db:"task_id"`
	LocalPort                  int              `json:"local_port" db:"local_port"`
	RemotePort                 int              `json:"remote_port" db:"remote_port"`
	RemoteIP                   string           `json:"remote_ip" db:"remote_ip"`
	OperationID                int              `json:"operation_id" db:"operation_id"`
	Username                   string           `json:"username" db:"username"`
	Password                   string           `json:"password" db:"password"`
	PortType                   CallbackPortType `json:"port_type" db:"port_type"`
	listener                   *net.Listener
	bytesReceivedFromAgentChan chan bytesReceivedFromAgentMessage
	bytesSentToAgentChan       chan bytesSentToAgentMessage
	acceptedConnections        *[]*acceptedConnection
	messagesToAgent            chan proxyToAgentMessage
	interactiveMessagesToAgent chan agentMessagePostResponseInteractive
	newConnectionChannel       chan *acceptedConnection
	removeConnectionsChannel   chan *acceptedConnection
	// messagesFromAgent - these get parsed by manageConnections and passed to the right connection's messagesFromAgent
	messagesFromAgent            chan proxyFromAgentMessage
	interactiveMessagesFromAgent chan agentMessagePostResponseInteractive
	stopAllConnections           chan bool
}

type callbackPortsInUse struct {
	ports                        []*callbackPortUsage
	proxyFromAgentMessageChannel chan ProxyFromAgentMessageForMythic
	bytesReceivedFromAgentChan   chan bytesReceivedFromAgentMessage
	bytesSentToAgentChan         chan bytesSentToAgentMessage
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
	c.ports = make([]*callbackPortUsage, 0)
	c.proxyFromAgentMessageChannel = make(chan ProxyFromAgentMessageForMythic, 2000)
	c.bytesReceivedFromAgentChan = make(chan bytesReceivedFromAgentMessage, 2000)
	c.bytesSentToAgentChan = make(chan bytesSentToAgentMessage, 2000)
	go c.ListenForProxyFromAgentMessage()
	go c.ListenForNewByteTransferUpdates()
	if err := database.DB.Select(&callbackPorts, `SELECT * FROM callbackport WHERE deleted=false`); err != nil {
		logging.LogError(err, "Failed to load callback ports from database")
	} else {
		for _, proxy := range callbackPorts {
			c.bytesSentToAgentChan <- bytesSentToAgentMessage{
				ByteCount:      proxy.BytesSent,
				CallbackPortID: proxy.ID,
				Initial:        true,
			}
			c.bytesReceivedFromAgentChan <- bytesReceivedFromAgentMessage{
				ByteCount:      proxy.BytesReceived,
				CallbackPortID: proxy.ID,
				Initial:        true,
			}
			newPort := callbackPortUsage{
				CallbackPortID:               proxy.ID,
				CallbackID:                   proxy.CallbackID,
				TaskID:                       proxy.TaskID,
				LocalPort:                    proxy.LocalPort,
				RemoteIP:                     proxy.RemoteIP,
				RemotePort:                   proxy.RemotePort,
				PortType:                     proxy.PortType,
				OperationID:                  proxy.OperationID,
				Username:                     proxy.Username,
				Password:                     proxy.Password,
				bytesSentToAgentChan:         c.bytesSentToAgentChan,
				bytesReceivedFromAgentChan:   c.bytesReceivedFromAgentChan,
				messagesToAgent:              make(chan proxyToAgentMessage, 1000),
				newConnectionChannel:         make(chan *acceptedConnection, 1000),
				removeConnectionsChannel:     make(chan *acceptedConnection, 1000),
				messagesFromAgent:            make(chan proxyFromAgentMessage, 1000),
				interactiveMessagesToAgent:   make(chan agentMessagePostResponseInteractive, 1000),
				interactiveMessagesFromAgent: make(chan agentMessagePostResponseInteractive, 1000),
				stopAllConnections:           make(chan bool),
			}
			acceptedConnections := make([]*acceptedConnection, 0)
			newPort.acceptedConnections = &acceptedConnections
			if err := newPort.Start(); err != nil {
				logging.LogError(err, "Failed to start listening", "port info", &newPort)
			} else {
				c.ports = append(c.ports, &newPort)
			}
		}
	}
}
func (c *callbackPortsInUse) ListenForNewByteTransferUpdates() {
	oldByteValues := make(map[int]map[string]int64)
	currentByteValues := make(map[int]map[string]int64)
	updateValuesChan := make(chan bool)
	go func() {
		// every 30s send a signal to make sure we update our current byte values if they've changed
		for {
			select {
			case <-time.After(20 * time.Second):
				updateValuesChan <- true
			}
		}
	}()
	defer func() {
		logging.LogError(nil, "no longer listening for new byte transfer updates")
	}()
	for {
		select {
		case <-updateValuesChan:
			for callbackPortID, _ := range currentByteValues {
				if currentByteValues[callbackPortID]["sent"] != oldByteValues[callbackPortID]["sent"] {
					go updateCallbackPortStats("bytes_sent", currentByteValues[callbackPortID]["sent"], callbackPortID)
					oldByteValues[callbackPortID]["sent"] = currentByteValues[callbackPortID]["sent"]
				}
				if currentByteValues[callbackPortID]["received"] != oldByteValues[callbackPortID]["received"] {
					go updateCallbackPortStats("bytes_received", currentByteValues[callbackPortID]["received"], callbackPortID)
					oldByteValues[callbackPortID]["received"] = currentByteValues[callbackPortID]["received"]
				}
			}

		case bytesFromAgentMsg := <-c.bytesReceivedFromAgentChan:
			if _, ok := currentByteValues[bytesFromAgentMsg.CallbackPortID]; !ok {
				currentByteValues[bytesFromAgentMsg.CallbackPortID] = map[string]int64{
					"received": 0,
					"sent":     0,
				}
				oldByteValues[bytesFromAgentMsg.CallbackPortID] = map[string]int64{
					"received": 0,
					"sent":     0,
				}
			}
			if bytesFromAgentMsg.Initial {
				oldByteValues[bytesFromAgentMsg.CallbackPortID]["received"] = bytesFromAgentMsg.ByteCount
				currentByteValues[bytesFromAgentMsg.CallbackPortID]["received"] = bytesFromAgentMsg.ByteCount
			} else {
				currentByteValues[bytesFromAgentMsg.CallbackPortID]["received"] += bytesFromAgentMsg.ByteCount
			}
		case bytesSentToAgentMsg := <-c.bytesSentToAgentChan:
			if _, ok := currentByteValues[bytesSentToAgentMsg.CallbackPortID]; !ok {
				currentByteValues[bytesSentToAgentMsg.CallbackPortID] = map[string]int64{
					"received": 0,
					"sent":     0,
				}
				oldByteValues[bytesSentToAgentMsg.CallbackPortID] = map[string]int64{
					"received": 0,
					"sent":     0,
				}
			}
			if bytesSentToAgentMsg.Initial {
				oldByteValues[bytesSentToAgentMsg.CallbackPortID]["sent"] = bytesSentToAgentMsg.ByteCount
				currentByteValues[bytesSentToAgentMsg.CallbackPortID]["sent"] = bytesSentToAgentMsg.ByteCount
			} else {
				currentByteValues[bytesSentToAgentMsg.CallbackPortID]["sent"] += bytesSentToAgentMsg.ByteCount
			}
		}
	}
}

func updateCallbackPortStats(field string, value int64, callbackPortID int) {
	updatedValue := value
	if updatedValue > POSTGRES_MAX_BIGINT {
		updatedValue = POSTGRES_MAX_BIGINT - 1
	}
	_, err := database.DB.Exec(fmt.Sprintf("UPDATE callbackport SET %s=$1 WHERE id=$2",
		field), value, callbackPortID)
	if err != nil {
		logging.LogError(err, "Failed to update callback port stats")
	}
}
func (c *callbackPortsInUse) ListenForProxyFromAgentMessage() {
	for {
		agentMessage := <-c.proxyFromAgentMessageChannel
		switch agentMessage.PortType {
		case CALLBACK_PORT_TYPE_RPORTFWD:
			fallthrough
		case CALLBACK_PORT_TYPE_SOCKS:
			// loop through each message and find the corresponding callback + local port combo
			for j := 0; j < len(agentMessage.Messages); j++ {
				for i := 0; i < len(c.ports); i++ {
					if c.ports[i].CallbackID == agentMessage.CallbackID && c.ports[i].PortType == agentMessage.PortType {
						if agentMessage.Messages[j].Port > 0 {
							// port is specified, try to find the right one
							if c.ports[i].LocalPort == agentMessage.Messages[j].Port {
								c.ports[i].messagesFromAgent <- agentMessage.Messages[j]
								break
							}
						} else {
							// didn't specify a specific port, to just send it to the first matching type
							c.ports[i].messagesFromAgent <- agentMessage.Messages[j]
							break
						}
					}
				}
				//logging.LogInfo("got message from agent", "chan", messages[j].ServerID, "p.messagesFromAgentQueue", len(c.ports[i].messagesFromAgent))
				//c.ports[i].messagesFromAgent <- agentMessage.Messages[j]
			}
		case CALLBACK_PORT_TYPE_INTERACTIVE:
			foundPort := false
			for i := 0; i < len(c.ports); i++ {
				if c.ports[i].CallbackID == agentMessage.CallbackID && c.ports[i].PortType == agentMessage.PortType {
					for j := 0; j < len(agentMessage.InteractiveMessages); j++ {
						//logging.LogInfo("got message from agent", "chan", messages[j].ServerID, "p.messagesFromAgentQueue", len(c.ports[i].messagesFromAgent))
						c.ports[i].interactiveMessagesFromAgent <- agentMessage.InteractiveMessages[j]
					}
					handleAgentMessagePostResponseInteractiveOutput(&agentMessage.InteractiveMessages)
					foundPort = true
					break
				}
			}
			if !foundPort {
				go handleAgentMessagePostResponseInteractiveOutput(&agentMessage.InteractiveMessages)
			}

		}
	}
}
func (c *callbackPortsInUse) GetNextAvailableLocalPort() uint32 {
	exposedPorts := utils.MythicConfig.ServerDynamicPorts
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
	for i, _ := range c.ports {
		switch c.ports[i].PortType {
		case CALLBACK_PORT_TYPE_RPORTFWD:
			// rpfwd doesn't bind a port on Mythic, so the ports don't count here
			continue
		case CALLBACK_PORT_TYPE_SOCKS:
			fallthrough
		case CALLBACK_PORT_TYPE_INTERACTIVE:
			if uint32(c.ports[i].LocalPort) == port {
				return true
			}
		}
	}
	return false
}
func (c *callbackPortsInUse) GetPortForTypeAndCallback(taskId int, callbackId int, portType CallbackPortType) int {
	for i, _ := range c.ports {
		switch portType {
		case CALLBACK_PORT_TYPE_SOCKS:
			if c.ports[i].PortType == portType && c.ports[i].CallbackID == callbackId {
				return c.ports[i].LocalPort
			}
		case CALLBACK_PORT_TYPE_RPORTFWD:
			fallthrough
		case CALLBACK_PORT_TYPE_INTERACTIVE:
			if c.ports[i].PortType == portType && c.ports[i].CallbackID == callbackId && c.ports[i].TaskID == taskId {
				return c.ports[i].LocalPort
			}
		}

	}
	return 0
}
func (c *callbackPortsInUse) GetDataForCallbackIdPortType(callbackId int, portType CallbackPortType) (interface{}, error) {
	var interactiveData []agentMessagePostResponseInteractive
	var socksData []proxyToAgentMessage
	fetchedInteractive := false
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID == callbackId && c.ports[i].PortType == portType {
			switch portType {
			case CALLBACK_PORT_TYPE_INTERACTIVE:
				interactiveData = append(interactiveData, c.ports[i].GetData().([]agentMessagePostResponseInteractive)...)
				fetchedInteractive = true
			case CALLBACK_PORT_TYPE_SOCKS:
				fallthrough
			case CALLBACK_PORT_TYPE_RPORTFWD:
				socksData = append(socksData, c.ports[i].GetData().([]proxyToAgentMessage)...)
			}

		}
	}
	if portType == CALLBACK_PORT_TYPE_INTERACTIVE && !fetchedInteractive {
		newInteractiveData, err := handleAgentMessageGetInteractiveTasking(callbackId)
		if err != nil {
			logging.LogError(err, "Failed to fetch interactive tasks")
		} else {
			interactiveData = append(interactiveData, newInteractiveData...)
		}
	}
	switch portType {
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		if len(interactiveData) > 0 {
			return interactiveData, nil
		}
	case CALLBACK_PORT_TYPE_SOCKS:
		fallthrough
	case CALLBACK_PORT_TYPE_RPORTFWD:
		if len(socksData) > 0 {
			return socksData, nil
		}
	}

	return nil, nil
}
func (c *callbackPortsInUse) SendDataToCallbackIdPortType(callbackId int, portType CallbackPortType, messages []proxyFromAgentMessage) {
	c.proxyFromAgentMessageChannel <- ProxyFromAgentMessageForMythic{
		CallbackID: callbackId,
		PortType:   portType,
		Messages:   messages,
	}
}
func (c *callbackPortsInUse) SendInteractiveDataToCallbackIdPortType(callbackId int, portType CallbackPortType, messages []agentMessagePostResponseInteractive) {
	c.proxyFromAgentMessageChannel <- ProxyFromAgentMessageForMythic{
		CallbackID:          callbackId,
		PortType:            portType,
		InteractiveMessages: messages,
	}
}
func (c *callbackPortsInUse) GetOtherCallbackIds(callbackId int) []int {
	callbackIds := []int{}
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID != callbackId {
			callbackIds = append(callbackIds, c.ports[i].CallbackID)
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
	if callbackPortID > 0 {
		c.bytesSentToAgentChan <- bytesSentToAgentMessage{
			ByteCount:      bytesSentToAgent,
			CallbackPortID: callbackPortID,
			Initial:        true,
		}
		c.bytesReceivedFromAgentChan <- bytesReceivedFromAgentMessage{
			ByteCount:      bytesReceivedFromAgent,
			CallbackPortID: callbackPortID,
			Initial:        true,
		}
	}
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
		bytesSentToAgentChan:         c.bytesSentToAgentChan,
		bytesReceivedFromAgentChan:   c.bytesReceivedFromAgentChan,
		messagesToAgent:              make(chan proxyToAgentMessage, 1000),
		newConnectionChannel:         make(chan *acceptedConnection, 1000),
		removeConnectionsChannel:     make(chan *acceptedConnection, 1000),
		messagesFromAgent:            make(chan proxyFromAgentMessage, 1000),
		interactiveMessagesToAgent:   make(chan agentMessagePostResponseInteractive, 1000),
		interactiveMessagesFromAgent: make(chan agentMessagePostResponseInteractive, 1000),
		stopAllConnections:           make(chan bool),
	}
	acceptedConnections := make([]*acceptedConnection, 0)
	newPort.acceptedConnections = &acceptedConnections
	err := newPort.Start()
	if err != nil {
		logging.LogError(err, "Failed to start new proxy port")
		return err
	}
	callbackPort := databaseStructs.Callbackport{}
	err = database.DB.Get(&callbackPort, `SELECT id FROM callbackport WHERE
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
		err = statement.Get(&newPort.CallbackPortID, newPort)
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
	} else {
		logging.LogError(err, "Failed to create new callback port mapping")
		if err := newPort.Stop(); err != nil {
			logging.LogError(err, "Failed to stop new callback port")
		}
		return err
	}
	c.ports = append(c.ports, &newPort)
	return nil

}
func (c *callbackPortsInUse) Test(callbackId int, portType CallbackPortType, localPort int, remotePort int,
	remoteIP string, operationId int, callbackPortID int) error {
	switch portType {
	case CALLBACK_PORT_TYPE_RPORTFWD:
		go func() {
			if !canReachRemoteHost(remoteIP, remotePort) {
				err := errors.New(fmt.Sprintf("Testing remote connection for rpfwd:\nfailed to reach remote host, %s:%d", remoteIP, remotePort))
				go SendAllOperationsMessage(err.Error(), operationId, "", database.MESSAGE_LEVEL_INFO)
			} else {
				go SendAllOperationsMessage(fmt.Sprintf("Testing remote connection for rpfwd:\nsuccessfully connected to remote host, %s:%d", remoteIP, remotePort),
					operationId, "", database.MESSAGE_LEVEL_INFO)
			}
		}()
	default:
		return errors.New("no testing capability for that kind of port")
	}
	return nil

}
func (c *callbackPortsInUse) Remove(callbackId int, portType CallbackPortType, localPort int, operationId int, remoteIP string, remotePort int,
	username string, password string) error {
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID == callbackId &&
			c.ports[i].OperationID == operationId &&
			c.ports[i].PortType == portType &&
			c.ports[i].Username == username &&
			c.ports[i].Password == password &&
			c.ports[i].LocalPort == localPort {
			if remoteIP != "" && remotePort != 0 && (remoteIP != c.ports[i].RemoteIP || remotePort != c.ports[i].RemotePort) {
				continue
			}
			err := c.ports[i].Stop()
			if err != nil {
				logging.LogError(err, "Failed to stop proxy")
				//c.Unlock()
				return err
			}
			queryString := `UPDATE callbackport SET deleted=true WHERE id=$1`
			queryArgs := []interface{}{c.ports[i].CallbackPortID}
			_, err = database.DB.Exec(queryString, queryArgs...)
			if err != nil {
				logging.LogError(err, "Failed to delete port mapping from database for proxy")
				//c.Unlock()
				return err
			}
			c.ports = append((c.ports)[:i], (c.ports)[i+1:]...)
			//c.Unlock()
			return nil

		}
	}
	//c.Unlock()
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
				go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return err
			}
			p.listener = &l
			go p.handleSocksConnections()
			go p.manageConnections()
			go SendAllOperationsMessage(fmt.Sprintf("Opened port %d for %s", p.LocalPort, p.PortType),
				p.OperationID, "", database.MESSAGE_LEVEL_INFO)
		} else {
			err := errors.New(fmt.Sprintf("Failed to start listening on port %d, it's not exposed through docker", p.LocalPort))
			logging.LogError(err, "Can't start listening")
			go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
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
				go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return err
			}
			p.listener = &l
			go p.handleInteractiveConnections()
			go p.manageConnections()
			go SendAllOperationsMessage(fmt.Sprintf("Opened port %d for %s", p.LocalPort, "interactive tasking"),
				p.OperationID, "", database.MESSAGE_LEVEL_INFO)

		} else {
			err := errors.New(fmt.Sprintf("Failed to start listening on port %d, it's not exposed through docker", p.LocalPort))
			logging.LogError(err, "Can't start listening")
			go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
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
	messagesToSendToAgent := make([]proxyToAgentMessage, len(p.messagesToAgent))
	for i := 0; i < len(messagesToSendToAgent); i++ {
		select {
		case messagesToSendToAgent[i] = <-p.messagesToAgent:
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
	messagesToSendToAgent := make([]agentMessagePostResponseInteractive, len(p.interactiveMessagesToAgent))
	for i := 0; i < len(messagesToSendToAgent); i++ {
		select {
		case messagesToSendToAgent[i] = <-p.interactiveMessagesToAgent:
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
							MessagesToAgent: p.messagesToAgent,
							ProxyType:       p.PortType,
							CallbackID:      p.CallbackID,
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
							MessagesToAgent: p.messagesToAgent,
							ProxyType:       p.PortType,
							CallbackID:      p.CallbackID,
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
							MessagesToAgent: p.messagesToAgent,
							CallbackID:      p.CallbackID,
							ProxyType:       p.PortType,
						}
						go SendAllOperationsMessage(fmt.Sprintf("Failed to connect to %s:%d for new rpfwd message", p.RemoteIP, p.RemotePort),
							p.OperationID, "rpfwd", database.MESSAGE_LEVEL_WARNING)
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
			database.MESSAGE_LEVEL_WARNING)
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
			database.MESSAGE_LEVEL_WARNING)
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
			// non-blocking send stats update
			go func(byteCount int64, callbackPortID int) {
				select {
				case p.bytesReceivedFromAgentChan <- bytesReceivedFromAgentMessage{ByteCount: byteCount, CallbackPortID: callbackPortID, Initial: false}:
				}
			}(int64(len(dataBytes)), p.CallbackPortID)

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
				for {
					buf := make([]byte, 4096)
					logging.LogDebug("looping to read from connection again", "server_id", newConnection.ServerID)
					length, err := conn.Read(buf)
					if length > 0 {
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
										p.OperationID, "udp_associate", database.MESSAGE_LEVEL_WARNING)
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
										go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
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
										interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
											Message: proxyToAgentMessage{
												Message:  newUDPConnectionBuf[:newUDPConnectionBufLength],
												IsExit:   false,
												ServerID: newUDPConnection.ServerID,
												Port:     p.LocalPort,
											},
											MessagesToAgent: p.messagesToAgent,
											CallbackID:      p.CallbackID,
											ProxyType:       p.PortType,
										}
										// non-blocking send stats update
										go func(byteCount int64, callbackPortID int) {
											select {
											case p.bytesSentToAgentChan <- bytesSentToAgentMessage{ByteCount: byteCount, CallbackPortID: callbackPortID, Initial: false}:
											}
										}(int64(newUDPConnectionBufLength), p.CallbackPortID)
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
													// non-blocking send stats update
													go func(byteCount int64, callbackPortID int) {
														select {
														case p.bytesReceivedFromAgentChan <- bytesReceivedFromAgentMessage{ByteCount: byteCount, CallbackPortID: callbackPortID, Initial: false}:
														}
													}(int64(len(dataBytes)), p.CallbackPortID)

													if agentMessage.IsExit {
														//logging.LogDebug("got message from agent isExit", "server_id", newConnection.ServerID)
														// cleanup the connection data, but don't tell the agent to close
														newUDPConnection.AgentClosedConnection = true
														p.removeConnectionsChannel <- &newUDPConnection
														return
													}
													interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
														Message: proxyToAgentMessage{
															Message:  nil,
															IsExit:   true,
															ServerID: newUDPConnection.ServerID,
															Port:     p.LocalPort,
														},
														MessagesToAgent: p.messagesToAgent,
														CallbackID:      p.CallbackID,
														ProxyType:       p.PortType,
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
						//logging.LogDebug("Message received from proxychains", "serverID", newConnection.ServerID, "size", length)
						interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
							Message: proxyToAgentMessage{
								Message:  buf[:length],
								IsExit:   err != nil,
								ServerID: newConnection.ServerID,
								Port:     p.LocalPort,
							},
							MessagesToAgent: p.messagesToAgent,
							CallbackID:      p.CallbackID,
							ProxyType:       p.PortType,
						}
						// non-blocking send stats update
						go func(byteCount int64, callbackPortID int) {
							select {
							case p.bytesSentToAgentChan <- bytesSentToAgentMessage{ByteCount: byteCount, CallbackPortID: callbackPortID, Initial: false}:
							}
						}(int64(length), p.CallbackPortID)
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
				// non-blocking send stats update
				select {
				case p.bytesReceivedFromAgentChan <- bytesReceivedFromAgentMessage{ByteCount: int64(len(dataBytes)), CallbackPortID: p.CallbackPortID}:
				default:
				}
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
		for {
			buf := make([]byte, 4096)
			//logging.LogDebug("looping to read from connection", "server_id", newConnection.ServerID)
			length, err := conn.Read(buf)
			if length > 0 {
				//logging.LogDebug("Message received for chan %d: length %v\n", newConnection.ServerID, length)
				interceptProxyToAgentMessageChan <- interceptProxyToAgentMessage{
					Message: proxyToAgentMessage{
						Message:  buf[:length],
						IsExit:   err != nil,
						ServerID: newConnection.ServerID,
						Port:     p.LocalPort,
					},
					MessagesToAgent: p.messagesToAgent,
					ProxyType:       p.PortType,
					CallbackID:      p.CallbackID,
				}
				// non-blocking send stats update
				select {
				case p.bytesSentToAgentChan <- bytesSentToAgentMessage{ByteCount: int64(length), CallbackPortID: p.CallbackPortID}:
				default:
				}
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
							// non-blocking send stats update
							select {
							case p.bytesReceivedFromAgentChan <- bytesReceivedFromAgentMessage{ByteCount: int64(len(dataBytes)), CallbackPortID: p.CallbackPortID}:
							default:
							}
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
								InteractiveMessagesToAgent: p.interactiveMessagesToAgent,
								CallbackID:                 p.CallbackID,
								ProxyType:                  p.PortType,
							}
							// non-blocking send stats update
							select {
							case p.bytesSentToAgentChan <- bytesSentToAgentMessage{ByteCount: int64(length), CallbackPortID: p.CallbackPortID}:
							default:
							}
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
