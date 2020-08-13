+++
title = "rm"
chapter = false
weight = 100
hidden = false
+++

## Summary

Remove a file, no quotes are necessary and relative paths are fine 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### path

- Description: Path to file to remove  
- Required Value: True  
- Default Value: None  

## Usage

```
rm ../path/to/file
```

## MITRE ATT&CK Mapping

- T1106  
- T1107  
## Detailed Summary
Uses ObjectiveC to remove the file specified:
```JavaScript
fileManager.removeItemAtPathError($(path), error);
```
