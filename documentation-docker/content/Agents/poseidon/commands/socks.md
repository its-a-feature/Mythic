+++
title = "socks"
chapter = false
weight = 127
hidden = false
+++

## Summary
start or stop socks.
  
- Needs Admin: False  
- Version: 1  
- Author: @its-a-feature

### Arguments

#### action

- Description: Start or Stop socks through this callback.  
- Required Value: True  
- Default Value: None  

#### port

- Description: Port number on Mythic server to open for socksv5  
- Required Value: True  
- Default Value: None  

## Usage

```
socks
```


## Detailed Summary
Start or stop the socks5 proxy. This opens the specified port and port+1 on the server running Mythic. The `port+1` is a local port only used by Mythic for forwarding traffic through the C2 channel.