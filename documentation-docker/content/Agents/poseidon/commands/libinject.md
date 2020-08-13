+++
title = "libinject"
chapter = false
weight = 115
hidden = false
+++

## Summary
Inject a library from on-host into a process on macOS.
  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### pid

- Description: PID of process to inject into.  
- Required Value: True  
- Default Value: None  

#### library

- Description: Path to the dylib to inject  
- Required Value: True  
- Default Value: None  

## Usage

```
libinject
```

## MITRE ATT&CK Mapping

- T1055 

## Detailed Summary

This command includes a shellcode stub which forces a process to load a dylib on macOS. The command uses process injection to inject this shellcode stub into a remote process which then loads the dylib specified with the library argument into the target process. 