+++
title = "cd"
chapter = false
weight = 100
hidden = false
+++

## Summary

Change the current working directory to another directory. No quotes are necessary and relative paths are fine 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### path

- Description: path to change directory to  
- Required Value: True  
- Default Value: None  

## Usage
### Without Popup Option
```
cd ../path/here
```

## MITRE ATT&CK Mapping

- T1083  
## Detailed Summary
You can either type `cd` and get a popup to fill in the path, or provide the path on the command line. This command boils down to a single Objective C call:

```JavaScript
fileManager.changeCurrentDirectoryPath(command_params['path']);
```
