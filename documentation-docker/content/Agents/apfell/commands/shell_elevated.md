+++
title = "shell_elevated"
chapter = false
weight = 100
hidden = false
+++

## Summary

The command will pop a dialog box for the user asking for them to authenticate (fingerprint reader too) so that the command you entered will be executed in an elevated context. Alternatively, you can supply a username and password and the command will run under their context (assuming they have the right permissions). Once you successfully authenticate, you have a time window where no more popups will occur, but you'll still execute subsequent commands in an elevated context.

WARNING! THIS IS SINGLE THREADED, IF YOUR COMMAND HANGS, THE AGENT HANGS!
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### command

- Description: Command to execute  
- Required Value: True  
- Default Value: None  

#### use_creds

- Description: Use supplied creds or prompt the user for creds   
- Required Value: True  
- Default Value: None  

#### user

- Description: User to run as   
- Required Value: True  
- Default Value: None  

#### credential

- Description: Credential to use  
- Required Value: True  
- Default Value: None  

#### prompt

- Description: What prompt to display to the user when asking for creds  
- Required Value: True  
- Default Value: None  

## Usage

```
shell_elevated
```

## MITRE ATT&CK Mapping

- T1059  
- T1141  
- T1169  
## Detailed Summary
This uses the JXA doShellScript command to execute the specified command. A few things to note though:
- This is single threaded, so commands executed in this way have a potential to hang the entire agent
- This spawns `/bin/sh -c [command]` on the command line
- This is actually `/bin/bash` emulating `/bin/sh` which causes some weirdness, so I do some redirection when you try to actually background a task
- This returns results using `\r` instead of `\n` or `\r\n` which is odd, so that is replaced before being returned.

The component that's different between this and the `shell` command is the addition of the `administratorPrivileges` section in the `doShellScript` function:
```JavaScript
currentApp.doShellScript(cmd, {administratorPrivileges:true,withPrompt:prompt});
```

