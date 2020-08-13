+++
title = "ls"
chapter = false
weight = 100
hidden = false
+++

## Summary

List contents of specified directory. 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24

### Arguments
This command will send any arguments as a `path` variables to the agent to change the current working directory too.

## Usage

```
ls [path]
```

## Detailed Summary
The ls command retrieves information about files and folders within a specified directory. This information is collected with multiple methods from the System.IO.File and System.IO.Directory classes. Information gathered includes name, size, timestamps, owner and if the object is hidden.

### Resources
- [Sharpsploit](https://github.com/cobbr/SharpSploit/blob/master/SharpSploit/Enumeration/Host.cs)