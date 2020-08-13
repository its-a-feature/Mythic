+++
title = "launchapp"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses the Objective C bridge to launch the specified app asynchronously and 'hidden' (it'll still show up in the dock for now). An example of the bundle name is 'com.apple.itunes' for launching iTunes. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### bundle

- Description: The Bundle name to launch
- Required Value: True  
- Default Value: None  

## Usage

```
launchapp {bundle name}
```


## Detailed Summary
This uses a single ObjC Bridge call to execute the bundle:
```JavaScript
ObjC.import('AppKit');
$.NSWorkspace.sharedWorkspace.launchAppWithBundleIdentifierOptionsAdditionalEventParamDescriptorLaunchIdentifier(
  command_params['bundle'],
  $.NSWorkspaceLaunchAsync | $.NSWorkspaceLaunchAndHide | $.NSWorkspaceLaunchWithoutAddingToRecents,
  $.NSAppleEventDescriptor.nullDescriptor,
  null
);
```
