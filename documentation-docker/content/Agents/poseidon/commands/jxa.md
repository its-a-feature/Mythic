+++
title = "jxa"
chapter = false
weight = 111
hidden = false
+++

## Summary
Execute JavaScript for Automation (JXA) code within the context of the agent.   jxa

- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### code

- Description: JXA Code to execute.  
- Required Value: True  
- Default Value: None  

## Usage

```
jxa {  "code": "ObjC.import('Cocoa'); $.NSBeep();" }
```


## Detailed Summary

This command uses the `OSAScript` Objective-C class and the `executeAndReturnError` method to compile and execute JXA code in-memory.