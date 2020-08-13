+++
title = "shell"
chapter = false
weight = 100
hidden = false
+++

## Summary


This runs {command} in a terminal by leveraging JXA's `Application.doShellScript({command}).`

WARNING! THIS IS SINGLE THREADED, IF YOUR COMMAND HANGS, THE AGENT HANGS!
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### command

- Description: Command to run  
- Required Value: True  
- Default Value: None  

## Usage
### Without Popup

```
shell {command}
```

## MITRE ATT&CK Mapping

- T1059  
## Detailed Summary
This uses the JXA doShellScript command to execute the specified command. A few things to note though:
- This is single threaded, so commands executed in this way have a potential to hang the entire agent
- This spawns `/bin/sh -c [command]` on the command line
- This is actually `/bin/bash` emulating `/bin/sh` which causes some weirdness, so I do some redirection when you try to actually background a task
- This returns results using `\r` instead of `\n` or `\r\n` which is odd, so that is replaced before being returned.
```JavaScript
let command = command_params['command'];
if(command[command.length-1] === "&"){
    //doShellScript actually does macOS' /bin/sh which is actually bash emulating sh
    //  so to actually background a task, you need "&> /dev/null &" at the end
    //  so I'll just automatically fix this so it's not weird for the operator
    command = command + "> /dev/null &";
}
response = currentApp.doShellScript(command);
if(response === undefined || response === ""){
    response = "No Command Output";
}
// shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
response = response.replace(/\r/g, "\n");
return {"user_output":response, "completed": true}
```
