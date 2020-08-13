+++
title = "cat"
chapter = false
weight = 100
hidden = false
+++

## Summary

Read the contents of a file and display it to the user. No need for quotes and relative paths are fine 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### path

- Description: path to file (no quotes required)  
- Required Value: True  
- Default Value: None  

## Usage

### Without Popup Option

```
cat /path/to/file
```

## MITRE ATT&CK Mapping

- T1081  
- T1106  
## Detailed Summary

You can either type `cat` and get a popup to fill in the path, or provide the path on the command line. This command boils down to a single Objective C call:

```JavaScript
$.NSString.stringWithContentsOfFileEncodingError($(command_params['path']), $.NSUTF8StringEncoding, $()).js;
```

This expects the contents of the file to be a string. If it's not a string, you should instead `download` the file.

