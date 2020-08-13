+++
title = "portscan"
chapter = false
weight = 119
hidden = false
+++

## Summary
Scan host(s) for open ports.
  
- Needs Admin: False  
- Version: 1  
- Author: @djhohnstein  

### Arguments

#### ports

- Description: List of ports to scan. Can use the dash separator to specify a range.  
- Required Value: True  
- Default Value: None  

#### hosts

- Description: List of hosts to scan  
- Required Value: True  
- Default Value: None  

## Usage

```
portscan
```

## MITRE ATT&CK Mapping

- T1046  
## Detailed Summary

Scan a single or range of hosts for the ports specified with the ports argument. This command can be killed with `jobkill uuid`