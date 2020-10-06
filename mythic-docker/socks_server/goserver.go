package main

import (
    "fmt"
    "net"
    "os"
    "sync"
    "math/rand"
    "time"
    "encoding/json"
    "encoding/base64"
    "encoding/binary"
    "bufio"
    "bytes"
)
const (
    CONN_HOST = "localhost"
    CONN_TYPE = "tcp"
    MESSAGE_SIZE = 512000
)
var (
    CONN_PORT string
    APFELL_PORT string
)
type mutexMap struct{
    sync.RWMutex
    m map[int32]chan []byte
}
type mythicMsg struct{
	ServerId	int32 	`json:"server_id"`
	Data		string 	`json:"data"`
}

func main() {
	wg := new(sync.WaitGroup)
	wg.Add(2)
    CONN_PORT = os.Args[1]
    APFELL_PORT = os.Args[2]
	var channelMap = mutexMap{m: make(map[int32]chan []byte)}
	var mythicChannel = make(chan []byte, 10*MESSAGE_SIZE)
    go startClientPort(&channelMap, mythicChannel, wg)
    go startServerPort(&channelMap, mythicChannel, wg)
    wg.Wait()
}
func startClientPort(channelMap *mutexMap, mythicChannel chan []byte, wg *sync.WaitGroup){
	// listen for connections from operator's proxychains connections
	
	l, err := net.Listen(CONN_TYPE, CONN_HOST+":"+CONN_PORT)
    if err != nil {
        fmt.Println("Error listening:", err.Error())
        wg.Done()
        os.Exit(1)
    }
    // Close the listener when the application closes.
    defer l.Close()
    fmt.Println("Listening on " + CONN_HOST + ":" + CONN_PORT)
    for {
        // Listen for an incoming connection.
        conn, err := l.Accept()
        if err != nil {
            fmt.Println("Error accepting: ", err.Error())
            wg.Done()
            os.Exit(1)
        }
        // Handle connections in a new goroutine.
        //fmt.Println("about to add connection")
        channelId := addMutexMap(channelMap)
        //fmt.Printf("added channelId: %d\n", channelId)
        go handleChannelRequest(conn, mythicChannel, channelMap, channelId)
    }
    wg.Done()
}
// Handles incoming requests from Mythic
func startServerPort(channelMap *mutexMap, mythicChannel chan []byte, wg *sync.WaitGroup){
	l, err := net.Listen(CONN_TYPE, CONN_HOST + ":" + APFELL_PORT)
	if err != nil {
		fmt.Println("Error listening:", err.Error())
		wg.Done()
		os.Exit(1)
	}
	defer l.Close()
    
	fmt.Println("Listening for Mythic on " + CONN_HOST + ":" + APFELL_PORT)
	for{
        
		conn, err := l.Accept() // wait for Mythic to connect to us
		if err != nil {
			fmt.Println("Error accepting: ", err.Error())
			wg.Done()
			os.Exit(1)
		}
		//fmt.Println("Accepted connection from Mythic")
		wg2 := new(sync.WaitGroup)
		wg2.Add(2)
		go serverReadFromMythic(conn, channelMap, wg2, mythicChannel)
		go serverWriteToMythic(conn, mythicChannel, wg2)
		wg2.Wait()
	}
}
func removeMutexMap(channelMap *mutexMap, connection int32, conn net.Conn) bool{
    existed := false
	channelMap.Lock()
    //fmt.Printf("Removing channel %v\n", connection)
    if val, ok := channelMap.m[connection]; ok{
        delete(channelMap.m, connection)
        //minimize the amount of time we're locked. no need to be locked during socket close times
        channelMap.Unlock()
        conn.Close()
        //fmt.Printf("Closed connection %d\n", connection)
        close(val)
        existed = true
    }else{
        channelMap.Unlock()
    }
    return existed
}
func addMutexMap(channelMap *mutexMap) int32{
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	in := make(chan []byte, MESSAGE_SIZE)
    channelId := r.Int31()
    channelMap.Lock()
    channelMap.m[channelId] = in
	channelMap.Unlock()
	return channelId
}
func handleChannelRequest(conn net.Conn, mythicChannel chan []byte, channelMap *mutexMap, channelId int32){
    //wg := new(sync.WaitGroup)
	//wg.Add(2)
	go readFromSocket(conn, mythicChannel, channelMap, channelId)
	go writeToSocket(conn, channelMap, channelId)
	//wg.Wait()
    // Close the connection when you're done with it.
    //conn.Close()
    //fmt.Println("Closed connection")
}
func readFromSocket(conn net.Conn, mythicChannel chan []byte, channelMap *mutexMap, channelId int32){
    bufIn := make([]byte, MESSAGE_SIZE)
	// Read the incoming connection into the buffer.
    r := bufio.NewReader(conn)
    totalRead, err := r.Read(bufIn)
    w := bufio.NewWriter(conn)
    //fmt.Printf("totalReadStartingConnection: %d\n", totalRead)
    if err != nil {
      //fmt.Println("Error reading: ", err.Error())
	  go removeMutexMap(channelMap, channelId, conn)
      return
    }
    if totalRead == 4{
        //fmt.Printf("initial message: %v\n", bufIn[:totalRead])
        w.Write([]byte{uint8(5), uint8(0)})
        w.Flush()
    }else{
	    go removeMutexMap(channelMap, channelId, conn)
        //fmt.Printf("exiting readFromSocket early due to bad initial message\n")
        return
    }
    //fmt.Printf("new connection in readFromSocket with channel %v\n", channelId)
	for{
		bufIn = make([]byte, MESSAGE_SIZE)
    	// Read the incoming connection into the buffer.
	    totalRead, err := r.Read(bufIn)
	    //fmt.Printf("totalRead in readFromSocket for channel %d: %d, %v\n", channelId, totalRead, err)
        if err != nil{
            // only signal end if this wasn't already signaled close from the server
            //fmt.Printf("error in readFromSocket %v, %v\n", err.Error(), channelId)
            if removeMutexMap(channelMap, channelId, conn){
                msg := mythicMsg{}
	            msg.ServerId = channelId
                msg.Data = "LTE=" //base64 of -1
                raw, err := json.Marshal(msg)
	            if err != nil {
	            	//fmt.Printf("error in marshal in read from socket\n")
	            	break;
	            }
	            mythicChannel <- raw // at some point, we're doing messages, and we error, make sure we send the close message
                //fmt.Printf("Signaled close of socket for channel %d\n", channelId)
            }
            go removeMutexMap(channelMap, channelId, conn)
            return
        }else if totalRead > 0{
            //fmt.Printf("read more data for %v\n", channelId)
            msg := mythicMsg{}
	        msg.ServerId = channelId
	        msg.Data = base64.StdEncoding.EncodeToString(bufIn[:totalRead])
            //fmt.Printf("base64 data from socket: %s\n", msg.Data)
	        raw, err := json.Marshal(msg)
	        if err != nil {
	        	//fmt.Printf("error in marshal in read from socket\n")
	        	break;
	        }
            mythicChannel <- raw
        }
	}
	//fmt.Printf("readFromSocket done, removing channel %d from mutex list\n", channelId)
}
func writeToSocket(conn net.Conn, channelMap *mutexMap, channelId int32){
    w := bufio.NewWriter(conn)
    exitMsg,_ := base64.StdEncoding.DecodeString("LTE=")
	for bufOut := range channelMap.m[channelId]{
		// Send a response back to person contacting us.
        if bytes.Compare(bufOut,exitMsg) == 0{
            //w.Write(bufOut)
		    //w.Flush()
            //no need to send close message here because the read will cover that case, no need to send it twice
            //fmt.Printf("Got kill connection message from Mythic for %v\n", channelId)
            go removeMutexMap(channelMap, channelId, conn)
            return
        }
        _, err := w.Write(bufOut)
		w.Flush()
		if err != nil {
	      //fmt.Println("Error writingToClient: ", err.Error())
	      // if we fail to write to our socket, close the connection
            w.Flush()
	        //fmt.Println("writeToSocket done")
            go removeMutexMap(channelMap, channelId, conn)
            return
	    }
	    //fmt.Printf("totalWrittenToClient: %d\n", totalWritten)
	}
}
func serverReadFromMythic(conn net.Conn, channelMap *mutexMap, wg *sync.WaitGroup, mythicChannel chan []byte){
	// while the connection is still alive, just keep trying to read from mythic and writing to the right
	//   socket internally
    r := bufio.NewReader(conn)
    exitMsg,_ := base64.StdEncoding.DecodeString("LTE=")
	for{
		lengthIn := make([]byte, 4)
        //fmt.Println("about to read from the mythic connection")
	    totalRead, err := r.Read(lengthIn)
        //fmt.Println("just read from mythic connection")
		if err != nil {
	      //fmt.Printf("Error reading size: %d, %s", totalRead, err.Error())
	      break
	    }
	    //fmt.Printf("read from length bytes of: %d\n", totalRead)
	    messageLen := uint32(binary.BigEndian.Uint32(lengthIn[:]))
        //fmt.Printf("Message len from mythic is: %d\n", messageLen)
	    message := make([]byte, messageLen)
	    totalRead, err = r.Read(message)
	    if err != nil {
            fmt.Println("Error reading message from Mythic: ", err)
        }else if uint32(totalRead) != messageLen{
	        //fmt.Println("reading from mythic connection, but totalRead: %d, messageLen: %d\n", totalRead, messageLen)
            // we didn't get our whole message in that read, so keep reading
            for{
                remainder := make([]byte, messageLen - uint32(totalRead))
                newRead, err := r.Read(remainder)
                if err != nil{
                    //fmt.Printf("Error in extra read loop: %v\n", err)
                    break
                }
                j := 0
                for i := uint32(totalRead); i < uint32(totalRead) + uint32(newRead); i++{
                    message[i] = remainder[j]
                    j = j + 1         
                }
                if uint32(newRead) + uint32(totalRead) == messageLen {
                    break
                }else{
                    totalRead = totalRead + newRead
                }
            }
            //fmt.Printf("Finished getting the rest of the message\n")
	    }
	    //now that we have the bytes of a message, send it
	    curMsg := mythicMsg{}
		err = json.Unmarshal(message, &curMsg)
		if err != nil{
			//fmt.Printf("Bad message received: %v\n", message)
			break
		}
        data, err := base64.StdEncoding.DecodeString(curMsg.Data)
		if err != nil{
			//fmt.Printf("Bad base64 data received\n")
            //fmt.Printf("%v\n", curMsg.Data)
			break
		}
		channelMap.RLock()
        thisChan, ok := channelMap.m[curMsg.ServerId]
        channelMap.RUnlock()
        //fmt.Printf("got data from agent for %v\n", curMsg.ServerId)
        if ok{
            //fmt.Printf("Got %d bytes from mythic to send to socket for channel %d\n", len(data), curMsg.ServerId)
            thisChan <- data
        }else{
            //got a message from mythic (i.e. from an agent) for a connection we don't know about
            //fmt.Printf("Got a message for a channel (%d) that's already closed\n", curMsg.ServerId)
            if bytes.Compare(data,exitMsg) != 0{
                // if it's not trying to send us the exit message, then something is up, so send them the exit message
                // this means the server has decided it's already closed, but the agent is still sending normal data, tell it to close
                msg := mythicMsg{}
                msg.ServerId = curMsg.ServerId
                msg.Data = "LTE=" //base64(-1)
                raw, err := json.Marshal(msg)
                if err != nil {
                	fmt.Printf("error in marshal in read from socket\n")
                }else{
                    mythicChannel <- raw
                    //fmt.Printf("Signaling for remote connection (%d) to close since it's still sending data\n", curMsg.ServerId)
                }
            }
            
        }
	}
	//fmt.Println("serverReadFromMythic done")
	wg.Done()
}
func serverWriteToMythic(conn net.Conn, mythicChannel chan []byte, wg *sync.WaitGroup){
	// while the connection is still alive, just keep trying to write things to mythic from the channel
    w := bufio.NewWriter(conn)
	for {
		select{
		case mythicChannelMsg := <-mythicChannel:
			length := make([]byte, 4)
			binary.BigEndian.PutUint32(length, uint32(len(mythicChannelMsg)))
            w.Write( append(length, mythicChannelMsg...) )
            w.Flush()
		default:
		    time.Sleep(100 * time.Millisecond)
		}
	}
    w.Flush()
	//fmt.Println("writing to mythic connection done")
	wg.Done()
}

