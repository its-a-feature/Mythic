+++
title = "screencapture"
chapter = false
weight = 123
hidden = false
+++

## Summary
Capture a screenshot of the targets desktop (not implemented on Linux).
  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

## Usage

```
screencapture
```

## MITRE ATT&CK Mapping

- T1113  
## Detailed Summary

This command uses the `CGDisplayCreateImageForRect` API function to obtain an image of the currently logged users desktop.