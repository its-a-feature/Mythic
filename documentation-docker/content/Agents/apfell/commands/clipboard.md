+++
title = "clipboard"
chapter = false
weight = 100
hidden = false
+++

## Summary

Get all the types of contents on the clipboard, return specific types, or set the contents of the clipboard. 

{{% notice warning %}}
 Root does _*NOT*_ have a clipboard
{{% /notice %}}

- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### types

- Description: Types of clipboard data to retrieve, defaults to `public.utf8-plain-text`
- Required Value: False  
- Default Value: None  

#### data

- Description: Data to put on the clipboard
- Required Value: False  
- Default Value: None
## Usage
### Reading Clipboard

#### Causes a Popup
```
clipboard
```
This will read the plaintext data on the clipboard and give information about the other keys that are available to read. If you then issue the command again with the keys you desire, the contents of those will be returned as well. This can be an extremely large amount of data as users copy folders, files, images, etc on their clipboard. All of this is available to you, but isn't returned by default.

### Writing Clipboard
#### Causes a Popup
```
clipboard
```
Set the `data` field to something other than empty to write to the clipboard.
#### No Popup Option
```
clipboard data
```


## MITRE ATT&CK Mapping

- T1115  
## Detailed Summary

This uses Objective C API calls to read all the types available on the general clipboard for the current user. The clipboard on macOS has a lot more data than _just_ what you copy. All of that data is collected and returned in a JSON blob of key:base64(data). To do this, we use this JavaScript code:
```JavaScript
let pb = $.NSPasteboard.generalPasteboard;
let types = pb.types.js;
let clipboard = {};
for(let i = 0; i < types.length; i++){
    let typejs = types[i].js;
    clipboard[typejs] = pb.dataForType(types[i]);
    if(clipboard[typejs].js !== undefined){
        clipboard[typejs] = clipboard[typejs].base64EncodedStringWithOptions(0).js;
    }else{
        clipboard[typejs] = "";
    }
}
```
There's a browserscript for this function that'll return all of the keys and the plaintext data if it's there.
