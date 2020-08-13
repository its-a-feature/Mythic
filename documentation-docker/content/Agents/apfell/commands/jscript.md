+++
title = "jscript"
chapter = false
weight = 100
hidden = false
+++

## Summary

This runs the JavaScript command, {command}, and returns its output via an eval(). The output will get passed through ObjC.deepUnwrap to parse out basic data types from ObjectiveC and get strings back 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### command

- Description: The JXA command to execute
- Required Value: True  
- Default Value: None  

## Usage

```
jscript {command}
```

## MITRE ATT&CK Mapping

- T1064  
## Detailed Summary
This can be a pretty powerful technique, but you need to be careful since you're executing arbitrary code within the context of your agent. Depending on what you're doing, ObjectiveC Bridge calls might segfault your agent since Apple and the bridge aren't stable.
```JavaScript
 ObjC.deepUnwrap(eval(command_params['command']));
```
