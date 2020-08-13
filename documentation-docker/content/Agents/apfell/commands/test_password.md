+++
title = "test_password"
chapter = false
weight = 100
hidden = false
+++

## Summary

Tests a password against a user to see if it's valid via an API call 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### password

- Description: Password to test  
- Required Value: True  
- Default Value: None  

#### username

- Description: Local user to test against  
- Required Value: True  
- Default Value: None  

## Usage
### Without Popup
```
test_password username password
```

## MITRE ATT&CK Mapping

- T1110  
## Detailed Summary
Uses the Collaboration and CoreServices Frameworks to test a local username/password combination.
```JavaScript
let user = $.CBIdentity.identityWithNameAuthority($(username), authority);
if(user.js !== undefined){
    if(user.authenticateWithPassword($(password))){
        return {"user_output":"Successful authentication", "completed": true};
    }
    else{
        return {"user_output":"Failed authentication", "completed": true};
    }
}
```
When typing out on the commandline (instead of the popup), the username is the first word and the password is all the rest
