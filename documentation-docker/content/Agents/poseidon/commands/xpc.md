+++
title = "xpc"
chapter = false
weight = 132
hidden = false
+++

## Summary
Use xpc to execute routines with launchd or communicate with another service/process.
  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior, @Morpheus______  

### Arguments

#### command

- Description: Choose an XPC command.  
- Required Value: True  
- Default Value: None  

#### program

- Description: Program/binary to execute if using 'submit' command  
- Required Value: False  
- Default Value: None  

#### file

- Description: Path to the plist file if using load/unload commands  
- Required Value: False  
- Default Value: None  

#### servicename

- Description: Name of the service to communicate with. Used with the submit, send, start/stop commands  
- Required Value: False  
- Default Value: None  

#### keepalive

- Description: KeepAlive boolean  
- Required Value: False  
- Default Value: None  

#### pid

- Description: PID of the process  
- Required Value: False  
- Default Value: None  

#### data

- Description: base64 encoded json data to send to a target service  
- Required Value: False  
- Default Value: None  

## Usage

```
xpc
```


## Detailed Summary

This command uses the `xpc_pipe_routine` function to send XPC messages to `launchd` for the following commands:

1. list -> use the ROUTINE_LIST routine to list registered services
2. start -> use the ROUTINE_START routine to start a registered service
3. stop -> use the ROUTINE_STOP routine to stop a registered service
4. load -> use the ROUTINE_LOAD routine to load a daemon property list file
5. unload -> use the ROUTINE_UNLOAD routine to unload a daemon property list file
6. status -> use the ROUTINE_STATUS routine to print status information about a given service
7. procinfo -> use the ROUTINE_DUMP_PROCESS routine to print information about the execution context of a given PID.
8. send -> send an XPC message to the specified service endpoint.
9. submit -> use the ROUTINE_SUBMIT routine to submit a program for launchd to execute