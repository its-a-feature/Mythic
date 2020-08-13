+++
title = "websocket"
chapter = false
weight = 5
+++

## Overview
The websockets protocol enables two-way communication between a client and remote host over a single connection. To establish a websockets connection, the client and the server complete a simple handshake followed by chunked messages (framing), layered over TCP. For more information, please review the RFC located here: https://tools.ietf.org/html/rfc6455. The 'Config.json' file is what configures the 'server' file within the docker container. Be sure to update this to match the port your server is listening on as well as updating it to match the configuration of your agent. The source code for the websockets server is based on @xorrior's code here: https://github.com/xorrior/poseidonC2.

The code has been slightly modified and included locally within the `C2_Profiles/websocket/c2_code/src` folder. There's also directions in there for if you want to modify and re-compile locally.

### Websockets C2 Workflow
{{<mermaid>}}
sequenceDiagram
    participant M as Mythic
    participant H as websocket
    participant A as Agent
    A -> H: 1
    Note over A: 2
    loop Websockets Protocol
    A -->> H: 3
    H ->> M: 4
    M -->> H: 5
    H -->> A: 6
    end
{{< /mermaid >}}

1. The Agent sends an HTTP/S Upgrade request to the Websockets server. The server responds with "HTTP/1.1 101 Switching Protocols". 
2. The Agent and Websocket server begin using the websockets protocol to send and receive messages.
3. Agent sends a message to receive taskings from server
4. Websocket sends a GET/POST request to receive taskings from Mythic
5. Mythic returns tasks to Websocket
6. Websocket sends new tasks to the agent

## Configuration Options
The profile reads a `config.json` file and starts a Golang websocket client to handle connections. 

```JSON
{
    "bindaddress": "0.0.0.0:8081",
    "ssl": false,
    "sslkey":"",
    "sslcert":"",
    "websocketuri": "socket",
    "defaultpage": "index.html",
    "logfile": "server.log",
    "debug": true
}
```
- bindaddress -> The bind IP and Port for the websocket server. This port needs to match what you use as the `Callback Port` when creating an agent.
- usessl -> Listen on the specified port and enable SSL. If "key.pem" and "cert.pem" don't exist, the server will generate a self-signed certificate and key file.
- defaultpage -> This value points to an html file that is served to clients that connect to any other URI except the one defined for the `websocketuri` key.
- sslkey -> path to the ssl private key
- sslcert -> path to the ssl certificate
- websocketuri -> Websocket endpoint used for client connections (e.g. wss://myserver/websocketuri)


### Profile Options
#### Base64 of a 32-byte AES Key
Base64 value of the AES pre-shared key to use for communication with the agent. This will be auto-populated with a static key for the operation, but you can also replace this with the base64 of any 32 bytes you want. If you don't want to use encryption here, blank out this value.

#### Callback Host
This is the address that the agent reaches out to. Since this is a websocket C2, the address must be a websocket address (i.e. `ws://127.0.0.1` or `wss://127.0.0.1`). For websockets, clients will use http/s for the initial upgrade request and then switch to wss or ws for websockets traffic.

#### User Agent
This is the User-Agent header set when reaching out to the Callback Host. The default value is `Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko`.

#### Callback Interval in seconds
This is the interval in seconds in which the agent reaches out to the Callback Host. The default value is 10 seconds. This affects two components:
1. How frequently the agent reaches out for tasking _within_ an already established websocket connection
2. How frequently the agent will try to re-establish the websocket connection.

#### Perform Key Exchange
This is a `T` or `F` flag for if the agent should perform an encrypted key exchange with the server when checking in for the first time. This provides perfect forward secrecy for communications. If this is set to `F`, then the agent will use the AES key for a static pre-shared key set of encrypted communications.

#### Host header value for domain fronting
This is the host header value if you want to perform domain fronting through your Callback Host. This is simply the value, not the `Host: ` part as well.

#### Callback Jitter in percent
This configures a +- randomized percentage of the callback interval so that checkins aren't at the exact same interval each time. This must be between 0 to 100.

#### Callback Port
This is the port to use when connecting to the Callback Host. If connecting to a `ws` address, the default is port 80, if connecting to a `wss` address, the default is 443, but any custom one can also be specified.

## OPSEC

The Agent uses HTTP/S to perform the initial upgrade request before using the websockets protocol.

## Development

Souce code is available here: https://github.com/xorrior/poseidonC2