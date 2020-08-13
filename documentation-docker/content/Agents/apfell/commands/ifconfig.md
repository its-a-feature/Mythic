+++
title = "ifconfig"
chapter = false
weight = 100
hidden = false
+++

## Summary

Return all the IP addresses associated with the host via an API call.
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
ifconfig
```


## Detailed Summary
This uses the ObjectiveC Bridge to read the IP addresses associated with the computer. This is helpful to determine if the user is hopping on/off VPNs:
```JavaScript
ObjC.deepUnwrap($.NSHost.currentHost.addresses)
```

