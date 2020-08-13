+++
title = "chrome_tabs"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses AppleEvents to list information about all of the open tabs in all of the open Chrome instances. 

If Chrome is not currently running, this will launch Chrome (potential OPSEC issue) and might have a conflict with trying to access Chrome tabs as Chrome is starting. It's recommended to not use this unless Chrome is already running. 

Use the list_apps function to check if Chrome is running.


{{% notice warning %}}
In Mojave+ (10.14+) this will cause a popup the first time asking for permission for your process to access Chrome. 
{{% /notice %}}

- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
chrome_tabs
```

## MITRE ATT&CK Mapping

- T1010  
## Detailed Summary

This boils down to a few AppleEvents to enumerate the open tabs in Chrome instances:

```JavaScript
let ch = Application("Google Chrome");
if(ch.running()){
    for (let i = 0; i < ch.windows.length; i++){
        let win = ch.windows[i];
        tabs["Window " + i] = {};
        for (let j = 0; j < win.tabs.length; j++){
            let tab = win.tabs[j];
            tabs["Window " + i]["Tab " + j] = {"title": tab.title(), "url": tab.url()};
        }
    }
}
```
