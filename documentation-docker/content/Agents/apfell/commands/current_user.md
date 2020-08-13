+++
title = "current_user"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses AppleEvents or ObjectiveC APIs to get information about the current user.

- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### method

- Description: Use AppleEvents or ObjectiveC calls to get user information
- Required Value: True  
- Default Value: api  

## Usage

```
current_user
```

## MITRE ATT&CK Mapping

- T1033  
## Detailed Summary

This boils down to AppleEvents to System Events or an ObjectiveC API call:
```JavaScript
if(method === "jxa"){
    let user = Application("System Events").currentUser;
    let info = "Name: " + user.name() +
    "\nFullName: " + user.fullName() +
    "\nhomeDirectory: " + user.homeDirectory() +
    "\npicturePath: " + user.picturePath();
    return {"user_output":info, "completed": true};
}
else if(method === "api"){
    let output = "\nUserName: " + $.NSUserName().js +
    "\nFull UserName: " + $.NSFullUserName().js +
    "\nHome Directory: " + $.NSHomeDirectory().js;
    return {"user_output":output, "completed": true};
}
```
