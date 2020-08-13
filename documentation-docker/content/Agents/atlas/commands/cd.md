+++
title = "cd"
chapter = false
weight = 100
hidden = false
+++

## Summary

Change current working directory of Atlas instance. 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24  

### Arguments
This command will send any arguments as a `path` variables to the agent to change the current working directory too.

## Usage

```
cd [C:\path\to\change\to]
```


## Detailed Summary
The `cd` command uses the `System.IO.Directory.SetCurrentDirectory` method to modify the process’s current working directory to a specified directory. This command accepts relative paths, such as `..` or `..\..\Users`. Quotes are not needed when changing to directories with spaces in their path name, such as `C:\Program Files`.
