+++
title = "exit"
chapter = false
weight = 100
hidden = false
+++

## Summary

Exit the extension 
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

## Usage

```
exit
```


## Detailed Summary

This exits the current instance of the browser extension. This does _NOT_ remove the extension. It simply kills the connection. If the target closes and re-opens Chrome, you will get a new callback. Similarly, if you push an update to the extension, you'll get a new callback.