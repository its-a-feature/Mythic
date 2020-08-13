+++
title = "getenv"
chapter = false
weight = 107
hidden = false
+++

## Summary
Get all of the current environment variables.
  
- Needs Admin: False  
- Version: 1  
- Author: @djhohnstein  

### Arguments

## Usage

```
getenv
```


## Detailed Summary

This command uses the `os.Environ()` golang function to retrieve the environment for the current process and returns a string array.