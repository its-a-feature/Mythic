+++
title = "listtasks"
chapter = false
weight = 115
hidden = false
+++

## Summary
Obtain a list of processes with obtainable task ports on macOS. This command should be used to determine target processes for the libinject command.
  
- Needs Admin: True  
- Version: 1  
- Author: @xorrior, @Morpheus______

### Arguments

## Usage

```
listtasks
```

## MITRE ATT&CK Mapping

- T1057  

## Detailed Summary

This command uses the `processor_set_tasks` and `pid_for_task` APIs to enumerate all available process tasks. This command should be used to identify target processes for the libinject command.