+++
title = "system_info"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses JXA to get some system information. It doesn't send Apple Events to any other applications though, so it shouldn't cause popups. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
system_info
```

## MITRE ATT&CK Mapping

- T1082  
## Detailed Summary
The function reads information about the current application via JXA:
```JavaScript
return {"user_output":JSON.stringify(currentApp.systemInfo(), null, 2), "completed": true};
```

