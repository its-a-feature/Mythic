+++
title = "config"
chapter = false
weight = 100
hidden = false
+++

## Summary
Modify aspects of the agent's running configuration.
 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24

### Arguments

#### info
display current agent configuration

#### domain
add/remove C2 domain/IP address

##### add
add a C2 domain to list of domains

##### remove
remove a C2 domain from list of domains (will not let list be less then one domain)

#### sleep
sleep time between taskings in seconds

#### jitter
variation in sleep time, specify as a percentage

#### host_header
host header to use for domain fronting

#### user_agent
user-agent header for web requests

#### param
option for query parameter used in GET requests

#### proxy
option to modify proxy settings

##### use_default
true/false, choose whether to use system default settings or manual settings specified in config

##### address
address of proxy server

##### username
username to authenticate to proxy server

##### password
password to authenticate to proxy server


## Usage

```
config [info | domain | sleep | jitter | host_header | user_agent | param | proxy] [add | remove | use_default | address | username | password] [options]
```


