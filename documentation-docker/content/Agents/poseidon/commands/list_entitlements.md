+++
title = "list_entitlements"
chapter = false
weight = 115
hidden = false
+++

## Summary
List the entitlements, code signatures, and path for processes on the system.
  
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### pid

- Description: PID of process to query (or -1 for all processes).  
- Required Value: True  
- Default Value: None  

## Usage

```
list_entitlements
```

## MITRE ATT&CK Mapping


## Detailed Summary

This command uses the csops syscall to query processes on the system for their code signature information, embedded entitlements, and associated binpaths.