+++
title = "exit"
chapter = false
weight = 100
hidden = false
+++

## Summary

This exits the current apfell agent by leveraging the ObjectiveC bridge's NSApplication terminate function. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
exit
```


## Detailed Summary

The command executes this call:
```JavaScript
$.NSApplication.sharedApplication.terminate(this);
```

