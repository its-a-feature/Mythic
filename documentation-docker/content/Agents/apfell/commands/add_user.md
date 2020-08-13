+++
title = "add_user"
chapter = false
weight = 100
hidden = false
+++

## Summary

Add a local user to the system by wrapping the Apple binary, dscl. 
- Needs Admin: True  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### password

- Description: p@55w0rd_here for new user  
- Required Value: False  
- Default Value: p@55w0rd_here  

#### passwd

- Description: password of the user that will execute the commands  
- Required Value: True  
- Default Value: None  

#### user

- Description: username that will execute the commands  
- Required Value: True  
- Default Value: None  

#### createprofile

- Description: create a user profile or not  
- Required Value: False  
- Default Value: False  

#### usershell

- Description: which shell environment should the new user have  
- Required Value: False  
- Default Value: /bin/bash  

#### primarygroupid

- Description: POSIX primary group id for the new account  
- Required Value: False  
- Default Value: 80  

#### uniqueid

- Description: POSIX unique id for the user  
- Required Value: False  
- Default Value: 403  

#### homedir

- Description: /Users/.jamf_support  
- Required Value: False  
- Default Value: None  

#### realname

- Description: Full user name  
- Required Value: False  
- Default Value: Jamf Support User  

#### usernane

- Description: POSIX username for account  
- Required Value: False  
- Default Value: .jamf_support  

#### hidden

- Description: Should the account be hidden from the logon screen  
- Required Value: False  
- Default Value: False  

#### admin

- Description: Should the account be an admin account  
- Required Value: False  
- Default Value: True  

## Usage

```
add_user
```

## MITRE ATT&CK Mapping

- T1136  
- T1169  
## Detailed Summary

This is a very noisy and non-opsec safe command since it does a LOT Of `dscl` commands via `shell_elevated` style of execution such as:
```JavaScript
let cmd = "dscl . create /Users/" + username;
currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
```

