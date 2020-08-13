+++
title = "jsimport_call"
chapter = false
weight = 100
hidden = false
+++

## Summary

Call a function from within the JXA file that was imported with `jsimport`. This function call is appended to the end of the jsimport code and called via eval. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### command

- Description: The command to execute within a file loaded via jsimport
- Required Value: True  
- Default Value: None  

## Usage

```
jsimport_call function_name();
```

## MITRE ATT&CK Mapping

- T1155  
- T1064  
## Detailed Summary
This function is executed via an eval statement within your current agent, so be careful about what it is you're trying to execute:
```JavaScript
let output = ObjC.deepUnwrap(eval(jsimport + "\n " + command_params['command']));
```
The command you speicfy is simply appended to the end of the file imported via `jsimport` and evaluated. 
