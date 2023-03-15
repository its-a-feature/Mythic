package rabbitmq

import (
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"math"
	"math/rand"
	"net"
	"sync"
)

type CallbackPortType = string

const (
	CALLBACK_PORT_TYPE_SOCKS           CallbackPortType = "socks"
	CALLBACK_PORT_TYPE_SOCKS_WITH_AUTH                  = "socks5"
	CALLBACK_PORT_TYPE_RPORTFWD                         = "rportfwd"
	CALLBACK_PORT_TYPE_INTERACTIVE                      = "interactive"
)

type proxyMessage struct {
	ServerID uint32 `json:"server_id" mapstructure:"server_id"`
	Message  []byte `json:"data" mapstructure:"data"`
	IsExit   bool   `json:"exit" mapstructure:"exit"`
}
type proxyFromAgentMessage struct {
	ServerID uint32 `json:"server_id" mapstructure:"server_id"`
	Message  string `json:"data" mapstructure:"data"`
	IsExit   bool   `json:"exit" mapstructure:"exit"`
}
type acceptedConnection struct {
	conn              net.Conn
	shouldClose       chan bool
	messagesFromAgent chan proxyFromAgentMessage
	ServerID          uint32
}
type callbackPortUsage struct {
	CallbackID          int              `json:"callback_id" db:"callback_id"`
	TaskID              int              `json:"task_id" db:"task_id"`
	Port                int              `json:"port" db:"port"`
	OperationID         int              `json:"operation_id" db:"operation_id"`
	PortType            CallbackPortType `json:"port_type" db:"port_type"`
	listener            *net.Listener
	acceptedConnections *[]*acceptedConnection
	messagesToAgent     chan proxyMessage
	sync.RWMutex
}

type callbackPortsInUse struct {
	ports []callbackPortUsage
	sync.RWMutex
}

var proxyPorts callbackPortsInUse

type ProxyStopResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}
type ProxyStop struct {
	CallbackID        int
	Port              int
	PortType          string
	OperatorOperation databaseStructs.Operatoroperation
}

func ManuallyStopProxy(input ProxyStop) ProxyStopResponse {
	resp := ProxyStopResponse{
		Status: "error",
		Error:  "callback and port not found",
	}
	if err := proxyPorts.Remove(input.CallbackID, input.PortType, input.Port, input.OperatorOperation.CurrentOperation.ID); err != nil {
		resp.Error = err.Error()
	} else {
		resp.Status = "success"
		resp.Error = ""
	}
	return resp
}
func (c *callbackPortsInUse) Initialize() {
	callbackPorts := []databaseStructs.Callbackport{}
	c.ports = make([]callbackPortUsage, 0)
	if err := database.DB.Select(&callbackPorts, `SELECT * FROM callbackport`); err != nil {
		logging.LogError(err, "Failed to load callback ports from database")
	} else {
		for _, proxy := range callbackPorts {
			newPort := callbackPortUsage{
				CallbackID:  proxy.CallbackID,
				TaskID:      proxy.TaskID,
				Port:        proxy.Port,
				PortType:    proxy.PortType,
				OperationID: proxy.OperationID,
			}
			acceptedConnections := make([]*acceptedConnection, 0)
			newPort.acceptedConnections = &acceptedConnections
			if err := newPort.Start(); err != nil {
				logging.LogError(err, "Failed to start listening", "port info", newPort)
			} else {
				c.ports = append(c.ports, newPort)
			}
		}
	}
}
func (c *callbackPortsInUse) GetDataForCallbackIdPortType(callbackId int, portType CallbackPortType) ([]proxyMessage, error) {
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID == callbackId && c.ports[i].PortType == portType {
			return c.ports[i].GetData(), nil
		}
	}
	return nil, nil
}
func (c *callbackPortsInUse) SendDataToCallbackIdPortType(callbackId int, portType CallbackPortType, messages []proxyFromAgentMessage) {
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID == callbackId && c.ports[i].PortType == portType {
			for j := 0; j < len(messages); j++ {
				c.ports[i].SendData(messages[j])
			}
		}
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
func (c *callbackPortsInUse) GetDataForCallbackId(callbackId int) ([]proxyMessage, error) {
	return c.GetDataForCallbackIdPortType(callbackId, CALLBACK_PORT_TYPE_SOCKS)
}
func (c *callbackPortsInUse) Add(callbackId int, portType CallbackPortType, port int, taskId int, operationId int) error {
	newPort := callbackPortUsage{
		CallbackID:  callbackId,
		TaskID:      taskId,
		Port:        port,
		OperationID: operationId,
		PortType:    portType,
	}
	acceptedConnections := make([]*acceptedConnection, 0)
	newPort.acceptedConnections = &acceptedConnections
	if err := newPort.Start(); err != nil {
		logging.LogError(err, "Failed to start new proxy port")
		return err
	} else if _, err := database.DB.NamedExec(`INSERT INTO callbackport 
		(task_id, operation_id, callback_id, port, port_type)
		VALUES (:task_id, :operation_id, :callback_id, :port, :port_type)`, newPort); err != nil {
		logging.LogError(err, "Failed to create new callback port mapping")
		if err := newPort.Stop(); err != nil {
			logging.LogError(err, "Failed to stop new callback port")
		}
		return err
	} else {
		c.ports = append(c.ports, newPort)
		return nil
	}
}
func (c *callbackPortsInUse) Remove(callbackId int, portType CallbackPortType, port int, operationId int) error {
	c.Lock()
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID == callbackId &&
			c.ports[i].OperationID == operationId &&
			c.ports[i].PortType == portType &&
			c.ports[i].Port == port {
			if err := c.ports[i].Stop(); err != nil {
				logging.LogError(err, "Failed to stop proxy")
				c.Unlock()
				return err
			} else if _, err := database.DB.Exec(`DELETE FROM callbackport WHERE
				callback_id=$1 AND port=$2 AND port_type=$3 AND operation_id=$4`,
				callbackId, port, portType, operationId); err != nil {
				logging.LogError(err, "Failed to delete port mapping from database for proxy")
				c.Unlock()
				return err
			} else {
				c.ports = append((c.ports)[:i], (c.ports)[i+1:]...)
				c.Unlock()
				return nil
			}
		}
	}
	c.Unlock()
	return nil
}
func isPortExposedThroughDocker(portToCheck int) bool {
	for _, port := range utils.MythicConfig.ServerDynamicPorts {
		if port == uint32(portToCheck) {
			return true
		}
	}
	return false
}
func (p *callbackPortUsage) Start() error {
	if isPortExposedThroughDocker(p.Port) {
		switch p.PortType {
		case CALLBACK_PORT_TYPE_SOCKS:
			addr := fmt.Sprintf("0.0.0.0:%d", p.Port)
			if l, err := net.Listen("tcp", addr); err != nil {
				logging.LogError(err, "Failed to start listening on new port")
				go database.SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return err
			} else {
				p.listener = &l
				p.messagesToAgent = make(chan proxyMessage, 10)
				go p.handleConnections()
			}

		case CALLBACK_PORT_TYPE_SOCKS_WITH_AUTH:
		case CALLBACK_PORT_TYPE_RPORTFWD:
		case CALLBACK_PORT_TYPE_INTERACTIVE:
		default:
			return errors.New("unknown proxy type")
		}
		return nil
	} else {
		err := errors.New(fmt.Sprintf("Failed to start listening on port %d, it's not exposed through docker", p.Port))
		logging.LogError(err, "Can't start listening")
		go database.SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
		return err
	}

}
func (p *callbackPortUsage) Stop() error {
	if err := (*p.listener).Close(); err != nil {
		logging.LogError(err, "Error calling close for the listener in the Stop function")
		return err
	}
	p.RLock()
	for i := 0; i < len(*p.acceptedConnections); i++ {
		(*p.acceptedConnections)[i].shouldClose <- true
	}
	p.RUnlock()
	return nil
}
func (p *callbackPortUsage) GetData() []proxyMessage {
	messagesToSendToAgent := []proxyMessage{}
	for {
		select {
		case msg := <-p.messagesToAgent:
			//logging.LogDebug("Got message from Mythic to agent", "msg", msg)
			messagesToSendToAgent = append(messagesToSendToAgent, msg)
		default:
			//logging.LogDebug("returning set of messages to agent from Mythic", "msgs", messagesToSendToAgent)
			return messagesToSendToAgent
		}
	}
}
func (p *callbackPortUsage) SendData(message proxyFromAgentMessage) {
	p.RLock()
	for i := 0; i < len(*p.acceptedConnections); i++ {
		if (*p.acceptedConnections)[i].ServerID == message.ServerID {
			//logging.LogDebug("Sending msg from agent to Mythic's messagesFromAgent channel", "msg", message)
			(*p.acceptedConnections)[i].messagesFromAgent <- message
			p.RUnlock()
			return
		}
	}
	p.RUnlock()
	logging.LogError(nil, "Tried to send data to a port with server id that doesn't exist anymore", "msg", message)
}
func (p *callbackPortUsage) addAcceptedConnection(newConnection *acceptedConnection) {
	p.Lock()
	*p.acceptedConnections = append(*p.acceptedConnections, newConnection)
	p.Unlock()
}
func (p *callbackPortUsage) removeAcceptedConnection(newConnection *acceptedConnection) {
	//logging.LogDebug("removingAcceptedConnection", "server_id", newConnection.ServerID)
	p.Lock()
	for i := 0; i < len(*p.acceptedConnections); i++ {
		if (*p.acceptedConnections)[i].ServerID == newConnection.ServerID {
			// splice out i, the connection that's gone
			//logging.LogDebug("Removing connection from accepted connections", "server_id", newConnection.ServerID)
			*p.acceptedConnections = append((*p.acceptedConnections)[:i], (*p.acceptedConnections)[i+1:]...)
			p.messagesToAgent <- proxyMessage{
				Message:  nil,
				IsExit:   true,
				ServerID: newConnection.ServerID,
			}
			p.Unlock()
			return
		}
	}
	p.Unlock()
}
func (p *callbackPortUsage) handleConnections() {
	switch p.PortType {
	case CALLBACK_PORT_TYPE_SOCKS:
		for {
			// Listen for an incoming connection
			if p.listener != nil {
				if conn, err := (*p.listener).Accept(); err != nil {
					logging.LogError(err, "Failed to accept new connection on port", "port", p.Port)
					if err := (*p.listener).Close(); err != nil {
						logging.LogError(err, "Failed to close listener", "port", p.Port)
					}
					//p.listener = nil
					return
				} else {
					// Handle connections in a new goroutine
					newConnection := acceptedConnection{
						conn:              conn,
						shouldClose:       make(chan bool, 1),
						messagesFromAgent: make(chan proxyFromAgentMessage, 10),
						ServerID:          uint32(rand.Intn(math.MaxInt32)), // randomized id
					}
					// add this connection for tracking so it can be cancelled later if needed

					// this reads from the connection and writes data for the agent to process
					initial := make([]byte, 4)
					if _, err := conn.Read(initial); err != nil {
						logging.LogError(err, "failed to read initial SOCKS connection data")
					} else if _, err := conn.Write([]byte{'\x05', '\x00'}); err != nil {
						logging.LogError(err, "Failed to send the \\x05\\x00 no-auth bytes for new socks connection")
						return
					}
					p.addAcceptedConnection(&newConnection)

					logging.LogDebug("Got new connection", "server_id", newConnection.ServerID)
					go func(conn net.Conn) {
						// function for reading from agents to send to Mythic's connections
						for {
							select {
							case <-newConnection.shouldClose:
								logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
								if err := conn.Close(); err != nil {
									logging.LogError(err, "Failed to close a connection when tasked to via shouldClose", "server_id", newConnection.ServerID)
								}
								newConnection.conn = nil
								p.removeAcceptedConnection(&newConnection)
								return
							case agentMessage := <-newConnection.messagesFromAgent:
								//logging.LogDebug("Writing to connection from agent", "msg", agentMessage)
								if dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Message); err != nil {
									logging.LogError(err, "Failed to base64 decode agent socks message", "server_id", newConnection.ServerID)
								} else if _, err := conn.Write(dataBytes); err != nil {
									logging.LogError(err, "Failed to write to connection", "server_id", newConnection.ServerID)
									if err := conn.Close(); err != nil {
										logging.LogError(err, "Failed to close connection", "server_id", newConnection.ServerID)
									}
									newConnection.shouldClose <- true
									newConnection.conn = nil
									p.removeAcceptedConnection(&newConnection)
									return
								} else if agentMessage.IsExit {
									logging.LogDebug("got message isExit", "server_id", newConnection.ServerID)
									if err := conn.Close(); err != nil {
										logging.LogError(err, "Failed to close connection", "server_id", newConnection.ServerID)
									}
									// cleanup the connection data
									newConnection.shouldClose <- true
									newConnection.conn = nil
									p.removeAcceptedConnection(&newConnection)
									return
								}

							}
						}

					}(conn)
					go func(conn net.Conn) {
						// function for reading from Mythic's connections to send to agents
						for {
							buf := make([]byte, 1024)
							logging.LogDebug("looping to read from connection again", "server_id", newConnection.ServerID)
							if length, err := conn.Read(buf); err != nil {
								logging.LogError(err, "Failed to read from connection", "server_id", newConnection.ServerID)
								p.messagesToAgent <- proxyMessage{
									Message:  nil,
									IsExit:   true,
									ServerID: newConnection.ServerID,
								}
								newConnection.shouldClose <- true
								p.removeAcceptedConnection(&newConnection)
								return
							} else {
								if length > 0 {
									//fmt.Printf("Message received for chan %d: %v\n", newConnection.ServerID, buf[:length])
									p.messagesToAgent <- proxyMessage{
										Message:  buf[:length],
										IsExit:   false,
										ServerID: newConnection.ServerID,
									}
								}
							}
						}

					}(conn)
				}
			} else {
				logging.LogError(nil, "Listener is nil, exiting the handleConnections loop", "port", p.Port)
				return
			}

		}
	case CALLBACK_PORT_TYPE_SOCKS_WITH_AUTH:
	case CALLBACK_PORT_TYPE_RPORTFWD:
	case CALLBACK_PORT_TYPE_INTERACTIVE:
	default:
		return
	}
}
