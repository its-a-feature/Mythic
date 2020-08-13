+++
title = "upload"
chapter = false
weight = 100
hidden = false
+++

## Summary

Upload a file to the target machine by selecting a file from your computer. 
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### file

- Description: file to upload   
- Required Value: True  
- Default Value: None  

#### remote_path

- Description: /remote/path/on/victim.txt  
- Required Value: True  
- Default Value: None  

## Usage

```
upload
```

## MITRE ATT&CK Mapping

- T1132  
- T1030  
- T1105  
## Detailed Summary
This function uses API calls to chunk and transfer a file down from Mythic to the agent, then uses API calls to write the file out to disk:
```JavaScript
if(typeof data == "string"){
    data = convert_to_nsdata(data);
}
if (data.writeToFileAtomically($(file_path), true)){
    return "file written";
}
```
After successfully writing the file to disk, the agent will report back the final full path so that it can be tracked within the UI.
