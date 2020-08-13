+++
title = "download"
chapter = false
weight = 100
hidden = false
+++

## Summary

Download a file from the victim machine to the Mythic server in chunks (no need for quotes in the path). 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
download {path to remote file}
```

## MITRE ATT&CK Mapping

- T1020  
- T1030  
- T1041  
## Detailed Summary

This function uses the loaded C2's `download` function to chunk data and send it up to the Mythic server. This chunking allows extremely large files to be sent over the network more easily. The initial message to Mythic will register the file in the database and information about it (like how many chunks it'll take). Then, using that new file identifier, the agent will start sending chunks.

