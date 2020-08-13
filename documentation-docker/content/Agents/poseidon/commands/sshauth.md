+++
title = "sshauth"
chapter = false
weight = 128
hidden = false
+++

## Summary
SSH to specified host(s) using the designated credentials. You can also use this to execute a specific command on the remote hosts via SSH or use it to SCP files.  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### username

- Description: Authenticate to the designated hosts using this username.  
- Required Value: True  
- Default Value: None  

#### source

- Description: If doing SCP, this is the source file  
- Required Value: False  
- Default Value:   

#### destination

- Description: If doing SCP, this is the destination file  
- Required Value: False  
- Default Value:   

#### private_key

- Description: Authenticate to the designated hosts using this private key  
- Required Value: False  
- Default Value: None  

#### port

- Description: SSH Port if different than 22  
- Required Value: True  
- Default Value: 22  

#### password

- Description: Authenticate to the designated hosts using this password  
- Required Value: False  
- Default Value:   

#### hosts

- Description: Hosts that you will auth to  
- Required Value: True  
- Default Value: None  

#### command

- Description: Command to execute on remote systems if not doing SCP  
- Required Value: False  
- Default Value:   

## Usage

```
sshauth
```

## MITRE ATT&CK Mapping

- T1110  
## Detailed Summary

Perform an SSH authentication sweep against a range of hosts and optionally provide a password or private key