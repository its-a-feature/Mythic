+++
title = "plist"
chapter = false
weight = 100
hidden = false
+++

## Summary

Read plists and their associated attributes for attempts to privilege escalate
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### filename

- Description: full filename path of type is just read  
- Required Value: False  
- Default Value: None  

#### type

- Description: read a specific plist file or all launchagents/launchdaemons  
- Required Value: True  
- Default Value: readLaunchAgents  

## Usage

```
plist
```

## MITRE ATT&CK Mapping

- T1083  
- T1007  
## Detailed Summary
The plist function uses API calls to read plist files and their associated attributes in an attempt to do privilege escalation or persistence.
- If the `type` is `read`, then the function will look at the specific path indicated by `filename` and read all of that plist
- Otherwise, the function will read all of the `LaunchAgents` or `LaunchDaemons` and give information about their associated programs.

For `LaunchDaemons` and `LaunchAgents`, the function looks at the `ProgramArguments` array as well and returns the permissions on those files since they might not be as protected as the plists themselves.
