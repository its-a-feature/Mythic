+++
title = "chrome_bookmarks"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses AppleEvents to list information about all of the bookmarks in Chrome. If Chrome is not currently running, this will launch Chrome (potential OPSEC issue) and might have a conflict with trying to access Chrome's bookmarks as Chrome is starting. It's recommended to not use this unless Chrome is already running. Use the list_apps function to check if Chrome is running.

{{% notice warning %}}
In Mojave and onward (10.14+) this will cause a popup the first time asking for permission for your process to access Chrome.
{{% /notice %}}
 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
chrome_bookmarks
```

## MITRE ATT&CK Mapping

- T1217  
## Detailed Summary

This uses AppleEvents to iterate through Chome's bookmarks:
```JavaScript
let ch = Application("Google Chrome");
if(ch.running()){
    let folders = ch.bookmarkFolders;
    for (let i = 0; i < folders.length; i ++){
        let folder = folders[i];
        let bookmarks = folder.bookmarkItems;
        all_data.push("Folder Name: " + folder.title());
        for (let j = 0; j < bookmarks.length; j++){
            let info = "Title: " + bookmarks[j].title() +
            "\nURL: " + bookmarks[j].url() +
            "\nindex: " + bookmarks[j].index() +
            "\nFolder/bookmark: " + i + "/" + j;
            all_data.push(info); //populate our array
        }
    }
```
