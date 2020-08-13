+++
title = "jsimport"
chapter = false
weight = 100
hidden = false
+++

## Summary

Import a JXA file into memory. Only one can be imported at a time. The ideal use case for this is to pull in something like [HealthInspector](https://github.com/its-a-feature/HealthInspector) or [Orchard](https://github.com/its-a-feature/Orchard) to extend your capabilities without having to make an entirely new command. With `jsimport_call` you're able to call functions from within these scripts and return output.
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### file

- Description: Select a JXA file to upload
- Required Value: True  
- Default Value: None  

## Usage

```
jsimport
```


## Detailed Summary
The file is pulled down via the C2 channel and stored in memory. Commands within this file are executed via the `jsimport_call` command:
```JavaScript
script = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(script_data, $.NSUTF8StringEncoding));
```
