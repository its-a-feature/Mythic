+++
title = "ps"
chapter = false
weight = 100
hidden = false
+++

## Summary

Gather list of running processes. 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24


## Usage

```
ps
```

## Detailed Summary
The ps command uses the System.Diagnostics.Process.GetProcesses method to collect information about running processes including process id, parent process id, process name, architecture, and user executing the process (High integrity required to collect other usernames).

### Resources
- [Sharpsploit](https://github.com/cobbr/SharpSploit/blob/master/SharpSploit/Enumeration/Host.cs)
