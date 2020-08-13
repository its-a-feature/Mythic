+++
title = "security_info"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses JXA to list some security information about the system by contacting the "System Events" application via Apple Events. This can cause a popup or be denied in Mojave and later
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
security_info 
```

## MITRE ATT&CK Mapping

- T1201  
## Detailed Summary
The JXA mechanism sends Apple Events to the "System Events" application to get some basic security information:
```JavaScript
let secObj = Application("System Events").securityPreferences();
let info = "automaticLogin: " + secObj.automaticLogin() +
"\nlogOutWhenInactive: " + secObj.logOutWhenInactive() +
"\nlogOutWhenInactiveInterval: " + secObj.logOutWhenInactiveInterval() +
"\nrequirePasswordToUnlock: " + secObj.requirePasswordToUnlock() +
"\nrequirePasswordToWake: " + secObj.requirePasswordToWake();
return {"user_output":info, "completed": true};
```
In Mojave and onward (10.14+) this can cause popups though, so be careful.
