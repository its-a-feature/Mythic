+++
title = "persist_folderaction"
chapter = false
weight = 100
hidden = false
+++

## Summary

Use Folder Actions to persist a compiled script on disk. You can either specify a 'URL' and automatically do a backgrounding one-liner, or supply your own code and language. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### code

- Description: osascript code  
- Required Value: False  
- Default Value: None  

#### url

- Description: http://url.of.host/payload  
- Required Value: False  
- Default Value: None  

#### folder

- Description: /path/to/folder/to/watch  
- Required Value: True  
- Default Value: None  

#### script_path

- Description: /path/to/script/to/create/on/disk  
- Required Value: True  
- Default Value: None  

#### language

- Description:  JavaScript or AppleScript based on the payload
- Required Value: True  
- Default Value: None  

## Usage

```
persist_folderaction
```


## Detailed Summary
This function creates a FolderAction at the specified `folder` for persistence. If you specify a `url`, then the code will generate a JavaScript one-liner download cradle as the payload to pull down a new `apfell` agent from that URL. Otherwise, you need to specify the `code` to execute and the `language` for it (JavaScript or AppleScript). Finally, Folder Actions require a `.scpt` file on disk that contains the code to execute, so you need to specify this as `script_path`. The function will generate the appropriate payload, compile it to a `.scpt` file and drop it to `script_path`.

This technique is pulled from the [SpecterOps blog](https://posts.specterops.io/folder-actions-for-persistence-on-macos-8923f222343d)
