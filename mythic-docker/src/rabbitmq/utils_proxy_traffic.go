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
	CallbackID               int              `json:"callback_id" db:"callback_id"`
	TaskID                   int              `json:"task_id" db:"task_id"`
	LocalPort                int              `json:"local_port" db:"local_port"`
	RemotePort               int              `json:"remote_port" db:"remote_port"`
	RemoteIP                 string           `json:"remote_ip" db:"remote_ip"`
	OperationID              int              `json:"operation_id" db:"operation_id"`
	PortType                 CallbackPortType `json:"port_type" db:"port_type"`
	listener                 *net.Listener
	acceptedConnections      *[]*acceptedConnection
	messagesToAgent          chan proxyToAgentMessage
	newConnectionChannel     chan *acceptedConnection
	removeConnectionsChannel chan *acceptedConnection
	// messagesFromAgent - these get parsed by manageConnections and passed to the right connection's messagesFromAgent
	messagesFromAgent  chan proxyFromAgentMessage
	stopAllConnections chan bool
}

type callbackPortsInUse struct {
	ports []*callbackPortUsage
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
	c.ports = make([]*callbackPortUsage, 0)
	if err := database.DB.Select(&callbackPorts, `SELECT * FROM callbackport`); err != nil {
		logging.LogError(err, "Failed to load callback ports from database")
	} else {
		for _, proxy := range callbackPorts {
			newPort := callbackPortUsage{
				CallbackID:               proxy.CallbackID,
				TaskID:                   proxy.TaskID,
				LocalPort:                proxy.LocalPort,
				RemoteIP:                 proxy.RemoteIP,
				RemotePort:               proxy.RemotePort,
				PortType:                 proxy.PortType,
				OperationID:              proxy.OperationID,
				messagesToAgent:          make(chan proxyToAgentMessage, 200),
				newConnectionChannel:     make(chan *acceptedConnection, 200),
				removeConnectionsChannel: make(chan *acceptedConnection, 200),
				messagesFromAgent:        make(chan proxyFromAgentMessage, 200),
				stopAllConnections:       make(chan bool),
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
func (c *callbackPortsInUse) GetDataForCallbackIdPortType(callbackId int, portType CallbackPortType) ([]proxyToAgentMessage, error) {
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
				//logging.LogInfo("got message from agent", "chan", messages[j].ServerID, "p.messagesFromAgentQueue", len(c.ports[i].messagesFromAgent))
				c.ports[i].messagesFromAgent <- messages[j]
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
func (c *callbackPortsInUse) GetDataForCallbackId(callbackId int, portType string) ([]proxyToAgentMessage, error) {
	return c.GetDataForCallbackIdPortType(callbackId, portType)
}
func (c *callbackPortsInUse) Add(callbackId int, portType CallbackPortType, localPort int, remotePort int, remoteIP string, taskId int, operationId int) error {
	newPort := callbackPortUsage{
		CallbackID:               callbackId,
		TaskID:                   taskId,
		LocalPort:                localPort,
		RemotePort:               remotePort,
		RemoteIP:                 remoteIP,
		OperationID:              operationId,
		PortType:                 portType,
		messagesToAgent:          make(chan proxyToAgentMessage, 200),
		newConnectionChannel:     make(chan *acceptedConnection, 200),
		removeConnectionsChannel: make(chan *acceptedConnection, 200),
		messagesFromAgent:        make(chan proxyFromAgentMessage, 200),
		stopAllConnections:       make(chan bool),
	}
	acceptedConnections := make([]*acceptedConnection, 0)
	newPort.acceptedConnections = &acceptedConnections
	if err := newPort.Start(); err != nil {
		logging.LogError(err, "Failed to start new proxy port")
		return err
	} else if _, err := database.DB.NamedExec(`INSERT INTO callbackport 
		(task_id, operation_id, callback_id, local_port, port_type, remote_port, remote_ip)
		VALUES (:task_id, :operation_id, :callback_id, :local_port, :port_type, :remote_port, :remote_ip)`, &newPort); err != nil {
		logging.LogError(err, "Failed to create new callback port mapping")
		if err := newPort.Stop(); err != nil {
			logging.LogError(err, "Failed to stop new callback port")
		}
		return err
	} else {
		c.ports = append(c.ports, &newPort)
		return nil
	}
}
func (c *callbackPortsInUse) Remove(callbackId int, portType CallbackPortType, localPort int, operationId int) error {
	for i := 0; i < len(c.ports); i++ {
		if c.ports[i].CallbackID == callbackId &&
			c.ports[i].OperationID == operationId &&
			c.ports[i].PortType == portType &&
			c.ports[i].LocalPort == localPort {
			if err := c.ports[i].Stop(); err != nil {
				logging.LogError(err, "Failed to stop proxy")
				//c.Unlock()
				return err
			} else if _, err := database.DB.Exec(`DELETE FROM callbackport WHERE
				callback_id=$1 AND local_port=$2 AND port_type=$3 AND operation_id=$4`,
				callbackId, localPort, portType, operationId); err != nil {
				logging.LogError(err, "Failed to delete port mapping from database for proxy")
				//c.Unlock()
				return err
			} else {
				c.ports = append((c.ports)[:i], (c.ports)[i+1:]...)
				//c.Unlock()
				return nil
			}
		}
	}
	//c.Unlock()
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
func canReachRemoteHost(remoteIP string, remotePort int) bool {
	if conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", remoteIP, remotePort)); err != nil {
		logging.LogError(err, "Failed to connect to remote for rpfwd", "remote_ip", remoteIP, "remote port", remotePort)
		return false
	} else {
		conn.Close()
		return true
	}
}
func (p *callbackPortUsage) Start() error {
	switch p.PortType {
	case CALLBACK_PORT_TYPE_SOCKS:
		if isPortExposedThroughDocker(p.LocalPort) {
			addr := fmt.Sprintf("0.0.0.0:%d", p.LocalPort)
			if l, err := net.Listen("tcp", addr); err != nil {
				logging.LogError(err, "Failed to start listening on new port")
				go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
				return err
			} else {
				p.listener = &l
				go p.handleSocksConnections()
				go p.manageConnections()
			}
		} else {
			err := errors.New(fmt.Sprintf("Failed to start listening on port %d, it's not exposed through docker", p.LocalPort))
			logging.LogError(err, "Can't start listening")
			go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
			return err
		}
	case CALLBACK_PORT_TYPE_RPORTFWD:
		if canReachRemoteHost(p.RemoteIP, p.RemotePort) {
			go p.manageConnections()
		} else {
			err := errors.New(fmt.Sprintf("Failed to reach remote host, %s:%d, unable to start rpfwd", p.RemoteIP, p.RemotePort))
			logging.LogError(err, "Can't start listening")
			go SendAllOperationsMessage(err.Error(), p.OperationID, "", database.MESSAGE_LEVEL_WARNING)
			return err
		}
	case CALLBACK_PORT_TYPE_INTERACTIVE:
	default:
		return errors.New("unknown proxy type")
	}
	return nil

}
func (p *callbackPortUsage) Stop() error {
	if p.listener != nil {
		if err := (*p.listener).Close(); err != nil {
			if err == net.ErrClosed {
				logging.LogInfo("tasking to stop all connections via channel")
				p.stopAllConnections <- true
				return nil
			}
			logging.LogError(err, "Error calling close for the listener in the Stop function")
			return err
		}
		logging.LogInfo("tasking to stop all connections via channel")
		p.stopAllConnections <- true
		return nil
	} else {
		logging.LogInfo("tasking to stop all connections via channel")
		p.stopAllConnections <- true
		return nil
	}

}
func (p *callbackPortUsage) GetData() []proxyToAgentMessage {
	messagesToSendToAgent := make([]proxyToAgentMessage, len(p.messagesToAgent))
	for i := 0; i < len(messagesToSendToAgent); i++ {
		select {
		case messagesToSendToAgent[i] = <-p.messagesToAgent:
			//logging.LogDebug("Got message from Mythic to agent", "serverID", messagesToSendToAgent[i].ServerID)
		default:
			//logging.LogDebug("returning set of messages to agent from Mythic", "msgs", messagesToSendToAgent)
			// this is in case we run out of messages for some reason
			return messagesToSendToAgent
		}
	}
	return messagesToSendToAgent
}
func (p *callbackPortUsage) manageConnections() {
	connectionMap := map[uint32]*acceptedConnection{}
	for {
		select {
		case newConn := <-p.newConnectionChannel:
			//logging.LogInfo("adding new connection channel in manageConnections")
			connectionMap[newConn.ServerID] = newConn
		case removeCon := <-p.removeConnectionsChannel:
			//logging.LogInfo("removing connection channel in manageConnection")
			if _, ok := connectionMap[removeCon.ServerID]; ok {
				connectionMap[removeCon.ServerID].shouldClose <- true
				close(connectionMap[removeCon.ServerID].messagesFromAgent)
				connectionMap[removeCon.ServerID].conn.Close()
				delete(connectionMap, removeCon.ServerID)
				p.messagesToAgent <- proxyToAgentMessage{
					Message:  nil,
					IsExit:   true,
					ServerID: removeCon.ServerID,
				}
			}
		case newMsg := <-p.messagesFromAgent:
			switch p.PortType {
			case CALLBACK_PORT_TYPE_SOCKS:
				//logging.LogInfo("got message from agent in p.messagesFromAgent", "chan", newMsg.ServerID)
				if _, ok := connectionMap[newMsg.ServerID]; ok {
					//logging.LogInfo("found supporting connection in connection map", "chan", newMsg.ServerID)
					connectionMap[newMsg.ServerID].messagesFromAgent <- newMsg
					//logging.LogInfo("send message along to acceptedConnection's messagesFromAgent", "chan", newMsg.ServerID)
				} else if !newMsg.IsExit {
					// we don't have knowledge of this ServerID and this isn't an "IsExit" message, so tell the other end to close
					p.messagesToAgent <- proxyToAgentMessage{
						Message:  nil,
						IsExit:   true,
						ServerID: newMsg.ServerID,
					}
				} else {
					//logging.LogInfo("unknown server id in connections map for messagesFromAgent", "serverID", newMsg.ServerID)
				}
			case CALLBACK_PORT_TYPE_RPORTFWD:
				//logging.LogInfo("got message from agent in p.messagesFromAgent", "chan", newMsg.ServerID)
				if _, ok := connectionMap[newMsg.ServerID]; ok {
					//logging.LogInfo("found supporting connection in connection map", "chan", newMsg.ServerID)
					// this means that we've seen this ServerID before, established a remote connection, and are just sending more data
					connectionMap[newMsg.ServerID].messagesFromAgent <- newMsg
					//logging.LogInfo("send message along to acceptedConnection's messagesFromAgent", "chan", newMsg.ServerID)
				} else {
					// got a new serverID from the agent that we aren't tracking, so we need to make a new connection
					if conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", p.RemoteIP, p.RemotePort)); err != nil {
						logging.LogError(err, "Failed to connect to remote for rpfwd", "remote_ip", p.RemoteIP, "remote port", p.RemotePort)
						p.messagesToAgent <- proxyToAgentMessage{
							Message:  nil,
							IsExit:   true,
							ServerID: newMsg.ServerID,
						}
					} else {
						// we have a valid connection to the remote server
						// Handle connections in a new goroutine
						newConnection := acceptedConnection{
							conn:              conn,
							shouldClose:       make(chan bool, 1),
							messagesFromAgent: make(chan proxyFromAgentMessage, 200),
							ServerID:          newMsg.ServerID, // randomized id
						}
						//p.newConnectionChannel <- &newConnection
						// using the channel like normal might cause a race condition with processing the next message from the agent
						connectionMap[newConnection.ServerID] = &newConnection
						//logging.LogInfo("made new connection to remote ip/port, about to handle connections")
						go p.handleRpfwdConnections(&newConnection)
						newConnection.messagesFromAgent <- newMsg
					}
				}
			case CALLBACK_PORT_TYPE_INTERACTIVE:
			default:

			}

		case <-p.stopAllConnections:
			for _, rmProxyData := range connectionMap {
				close(rmProxyData.messagesFromAgent)
				rmProxyData.conn.Close()
				delete(connectionMap, rmProxyData.ServerID)
			}
			return
		case <-time.After(10 * time.Second):
			//logging.LogError(nil, "1s timeout, re-looping", "p.newConnectionChannel", len(p.newConnectionChannel),
			//	"p.removeConnectionsChannel", len(p.removeConnectionsChannel),
			//	"p.messagesFromAgent", len(p.messagesFromAgent))
		}

	}

}
func (p *callbackPortUsage) handleSocksConnections() {
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
				newConnection := acceptedConnection{
					conn:              conn,
					shouldClose:       make(chan bool, 1),
					messagesFromAgent: make(chan proxyFromAgentMessage, 200),
					ServerID:          uint32(rand.Intn(math.MaxInt32)), // randomized id
				}
				// add this connection for tracking so it can be cancelled later if needed

				// this reads from the connection and writes data for the agent to process
				initial := make([]byte, 4)
				if _, err := conn.Read(initial); err != nil {
					logging.LogError(err, "failed to read initial SOCKS connection data")
					return
				} else if _, err := conn.Write([]byte{'\x05', '\x00'}); err != nil {
					logging.LogError(err, "Failed to send the \\x05\\x00 no-auth bytes for new socks connection")
					return
				}
				p.newConnectionChannel <- &newConnection

				//logging.LogDebug("Got new connection", "server_id", newConnection.ServerID)
				go func(conn net.Conn) {
					// function for reading from agents to send to Mythic's connections
					for {
						select {
						case <-newConnection.shouldClose:
							//logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
							p.removeConnectionsChannel <- &newConnection
							return
						case agentMessage := <-newConnection.messagesFromAgent:
							//logging.LogDebug("Writing to connection from agent", "serverID", agentMessage.ServerID)
							if dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Message); err != nil {
								logging.LogError(err, "Failed to base64 decode agent socks message", "server_id", newConnection.ServerID)
							} else if _, err := conn.Write(dataBytes); err != nil {
								logging.LogError(err, "Failed to write to connection", "server_id", newConnection.ServerID)
								p.removeConnectionsChannel <- &newConnection
								return
							} else if agentMessage.IsExit {
								//logging.LogDebug("got message isExit", "server_id", newConnection.ServerID)
								// cleanup the connection data
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
						if length, err := conn.Read(buf); err != nil {
							logging.LogError(err, "Failed to read from connection, sending exit", "server_id", newConnection.ServerID)
							p.messagesToAgent <- proxyToAgentMessage{
								Message:  nil,
								IsExit:   true,
								ServerID: newConnection.ServerID,
							}
							p.removeConnectionsChannel <- &newConnection
							return
						} else {
							if length > 0 {
								//fmt.Printf("Message received for chan %d: length %v\n", newConnection.ServerID, length)
								p.messagesToAgent <- proxyToAgentMessage{
									Message:  buf[:length],
									IsExit:   false,
									ServerID: newConnection.ServerID,
								}
								//fmt.Printf("Message sent to p.messagesToAgent channel for chan %d\n", newConnection.ServerID)
							}
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
func (p *callbackPortUsage) handleRpfwdConnections(newConnection *acceptedConnection) {
	//logging.LogDebug("Got new connection, spinning off read and write", "server_id", newConnection.ServerID)
	go func(conn net.Conn) {
		// function for reading from agents to send to Mythic's connections
		for {
			select {
			case <-newConnection.shouldClose:
				//logging.LogDebug("got message to close connection", "server_id", newConnection.ServerID)
				p.removeConnectionsChannel <- newConnection
				return
			case agentMessage := <-newConnection.messagesFromAgent:
				//logging.LogDebug("Writing to connection from agent", "serverID", agentMessage.ServerID)
				if dataBytes, err := base64.StdEncoding.DecodeString(agentMessage.Message); err != nil {
					logging.LogError(err, "Failed to base64 decode agent socks message", "server_id", newConnection.ServerID)
				} else if _, err := conn.Write(dataBytes); err != nil {
					logging.LogError(err, "Failed to write to connection", "server_id", newConnection.ServerID)
					p.removeConnectionsChannel <- newConnection
					return
				} else if agentMessage.IsExit {
					//logging.LogDebug("got message isExit", "server_id", newConnection.ServerID)
					// cleanup the connection data
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
			if length, err := conn.Read(buf); err != nil {
				logging.LogError(err, "Failed to read from connection, sending exit", "server_id", newConnection.ServerID)
				p.messagesToAgent <- proxyToAgentMessage{
					Message:  nil,
					IsExit:   true,
					ServerID: newConnection.ServerID,
				}
				p.removeConnectionsChannel <- newConnection
				return
			} else {
				if length > 0 {
					//logging.LogDebug("Message received for chan %d: length %v\n", newConnection.ServerID, length)
					p.messagesToAgent <- proxyToAgentMessage{
						Message:  buf[:length],
						IsExit:   false,
						ServerID: newConnection.ServerID,
					}
					//fmt.Printf("Message sent to p.messagesToAgent channel for chan %d\n", newConnection.ServerID)
				}
			}
		}
	}(newConnection.conn)
}
