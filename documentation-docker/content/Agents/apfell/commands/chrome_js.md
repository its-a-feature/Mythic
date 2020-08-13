+++
title = "chrome_js"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses AppleEvents to execute the specified JavaScript code into a specific browser tab. The `chrome_tab`s function will specify the window/tab numbers that you can use for this function. 

{{% notice info %}}
By default this ability is disabled in Chrome now, you will need to go to view->Developer->Allow JavaScript from Apple Events. 
{{% /notice %}}

- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### window

- Description: Window # from chrome_tabs  
- Required Value: True  
- Default Value: None  

#### javascript

- Description: javascript to execute  
- Required Value: True  
- Default Value: None  

#### tab

- Description: Tab # from chrome_tabs  
- Required Value: True  
- Default Value: None  

## Usage

```
chrome_js
```

## MITRE ATT&CK Mapping

- T1106  
- T1064  
## Detailed Summary

This boils down to a simple AppleEvent message:

```JavaScript
let result = Application("Google Chrome").windows[window].tabs[tab].execute({javascript:jscript});
```

