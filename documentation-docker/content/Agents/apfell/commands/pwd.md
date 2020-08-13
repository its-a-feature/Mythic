+++
title = "pwd"
chapter = false
weight = 100
hidden = false
+++

## Summary

Prints the current working directory for the agent 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
pwd
```

## MITRE ATT&CK Mapping

- T1083  
## Detailed Summary
Uses ObjectiveC to print the current working directory:
```JavaScript
let fileManager = $.NSFileManager.defaultManager;
let cwd = fileManager.currentDirectoryPath;
```

