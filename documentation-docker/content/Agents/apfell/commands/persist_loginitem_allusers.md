+++
title = "persist_loginitem_allusers"
chapter = false
weight = 100
hidden = false
+++

## Summary

Add a login item for all users via the LSSharedFileListInsertItemURL. The kLSSharedFileListGlobalLoginItems constant is used when creating the shared list in the LSSharedFileListCreate function. Before calling LSSharedFileListInsertItemURL, AuthorizationCreate is called to obtain the necessary rights. If the current user is not an administrator, the LSSharedFileListInsertItemURL function will fail.
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### path

- Description: path to binary to execute on execution
- Required Value: True  
- Default Value: None  

#### name

- Description: The name that is displayed in the Login Items section of the Users & Groups preferences pane
- Required Value: True  
- Default Value: None 

## Usage

```
persist_loginitem_allusers
```

## Detailed Summary
This function uses ObjectiveC API calls to set a new login item
```JavaScript
let result = $.AuthorizationCreate($.nil, $.nil, $.kAuthorizationDefaults, Ref(auth));
if (result === 0) {
    let temp = $.CFURLCreateWithString($.kCFAllocatorDefault, args['path'], $.nil);
    let items = $.LSSharedFileListCreate($.kCFAllocatorDefault, $.kLSSharedFileListGlobalLoginItems, $.nil);
    $.LSSharedFileListSetAuthorization(items, auth);
    let cfName = $.CFStringCreateWithCString($.nil, args['name'], $.kCFStringEncodingASCII);
    let itemRef = $.LSSharedFileListInsertItemURL(items, $.kLSSharedFileListItemLast, cfName, $.nil, temp, $.nil, $.nil);
    return {"user_output": "LoginItem installation successful", "completed": true};
}
```