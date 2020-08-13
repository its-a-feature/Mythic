+++
title = "getuser"
chapter = false
weight = 108
hidden = false
+++

## Summary
Get information regarding the current user context.
  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

## Usage

```
getuser
```

## MITRE ATT&CK Mapping

- T1033  
## Detailed Summary

This command uses the golang `os/user` package and the `user.CurrentUser()` function to return the current users username, uid, gid, and home directory.