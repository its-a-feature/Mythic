+++
title = "terminals_send"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses AppleEvents to inject the shell command, {command}, into the specified terminal shell as if the user typed it from the keyboard. This is pretty powerful. Consider the instance where the user is SSH-ed into another machine via terminal - with this you can inject commands to run on the remote host. 

Just remember, the user will be able to see the command, but you can always see what they see as well with the `terminals_read` command.
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### window

- Description: window # to send command to   
- Required Value: True  
- Default Value: None  

#### tab

- Description: tab # to send command to   
- Required Value: True  
- Default Value: None  

#### command

- Description: command to execute  
- Required Value: True  
- Default Value: None  

## Usage

```
terminals_send
```

## MITRE ATT&CK Mapping

- T1059  
- T1184  
## Detailed Summary
To get the window/tab combination needed for this command, run `terminals_read` first. This uses Terminal's own AppleEvent API to accept and execute commands. 

```JavaScript
let term = Application("Terminal");
if(term.running()){
    let window = split_params['window'];
    let tab = split_params['tab'];
    let cmd = split_params['command'];
    term.doScript(cmd, {in:term.windows[window].tabs[tab]});
    output = term.windows[window].tabs[tab].contents();
}else{
    return {"user_output":"Terminal is not running", "completed": true, "status": "error"};
}
```

