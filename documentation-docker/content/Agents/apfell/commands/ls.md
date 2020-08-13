+++
title = "ls"
chapter = false
weight = 100
hidden = false
+++

## Summary

Get attributes about a file and display it to the user via API calls. No need for quotes and relative paths are fine 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### path

- Description: Path of file or folder on the current system to list   
- Required Value: True  
- Default Value: .  

## Usage

```
ls /path/to/file
```

## MITRE ATT&CK Mapping

- T1106  
- T1083  
## Detailed Summary
This command used API calls to get the contents of directories and the attributes of files. This includes extended attributes as well which are base64 encoded and returned:
```JavaScript
ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path), error));
ObjC.deepUnwrap(fileManager.contentsOfDirectoryAtPathError($(path), error));
```

There is also some weirdness that has to happen to get the proper POSIX attributes that people are used to seeing on the command line:
```JavaScript
let nsposix = attr['NSFilePosixPermissions'];
// we need to fix this mess to actually be real permission bits that make sense
file_add['permissions']['posix'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
```

This command helps populate the file browser, which is where all this data can be seen.
