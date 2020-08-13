+++
title = "inject"
chapter = false
weight = 100
hidden = false
+++

## Summary

Inject arbitrary javascript into a browser tab 
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### tabid

- Description:   
- Required Value: True  
- Default Value: None  

#### javascript

- Description: Base64 encoded javascript  
- Required Value: False  
- Default Value: None  

## Usage

```
inject {"tabid":0,"javascript":"base64 encoded javascript"}
```


## Detailed Summary

This command uses the chrome.tabs.executeScript API to inject arbitrary javascript code into a browser tab.
https://developer.chrome.com/extensions/tabs#method-executeScript