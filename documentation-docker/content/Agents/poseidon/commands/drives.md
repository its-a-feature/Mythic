+++
title = "drives"
chapter = false
weight = 105
hidden = false
+++

## Summary
Get information about mounted drives on Linux hosts only.
 
- Needs Admin: False  
- Version: 1  
- Author: @djhohnstein 

### Arguments

## Usage

```
drives
```

## MITRE ATT&CK Mapping

- T1135  
## Detailed Summary

This command use the os.Stat function in Golang to enumerate the `/mnt` and `/Volumes` directories. This command is only available for nix systems.