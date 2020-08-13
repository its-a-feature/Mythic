+++
title = "load"
chapter = false
weight = 100
hidden = false
+++

## Summary

This loads new functions into memory via the C2 channel 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
load cmd1 cmd2 cmd3...
```

## MITRE ATT&CK Mapping

- T1030  
- T1129  
## Detailed Summary
The associated command's `.js` files are concatenated, base64 encoded, and sent down to the agent to be loaded in. 

>**WARNING** there is currently an issue with loading new commands when the payload is obfuscated
