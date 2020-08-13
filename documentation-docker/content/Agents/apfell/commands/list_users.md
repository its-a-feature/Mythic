+++
title = "list_users"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses JXA to list the non-service user accounts on the system. You can specify a GID to look at the users of a certain group or you can specify 'groups' to be true and enumerate users by groups 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### gid

- Description:  Enumerate users in a specific group or -1 for all groups
- Required Value: False  
- Default Value: None  

#### groups

- Description: Enumerate groups and their members 
- Required Value: False  
- Default Value: None  

## Usage

```
list_users
```

## MITRE ATT&CK Mapping

- T1087  
- T1069  
## Detailed Summary

- If gid is -1 and groups is false, enumerates all users and prints their info
- If gid is -1 and groups is true, enumerate all groups and their members
- If gid > 0, enumerate all users within the specified group 

All of these options are done via the Collaboration and CoreServices Frameworks and queried via API calls.

