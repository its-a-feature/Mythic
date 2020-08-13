+++
title = "rm"
chapter = false
weight = 100
hidden = false
+++

## Summary

Delete the specified file. 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24

### Arguments
This command will send any arguments as a `path` variables to the agent to the specified file.

## Usage

```
rm [filename]
```


## Detailed Summary
This command uses the `System.IO.File.Delete` class method to remove files from disk.
