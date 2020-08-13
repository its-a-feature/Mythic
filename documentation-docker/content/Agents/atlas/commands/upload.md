+++
title = "upload"
chapter = false
weight = 100
hidden = false
+++

## Summary

Upload a file to the remote host 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24

### Arguments

#### assembly_id

- Description: The file to uploaded to the target host.
- Required Value: True  
- Default Value: None  

#### remote_path

- Description: Take a file from the database and store it on disk through the callback.  
- Required Value: True  
- Default Value: None  

## Usage

```
upload
```

## MITRE ATT&CK Mapping

- T1132  
- T1030  
- T1041  

## Detailed Summary
Files being uploaded to an agent infected host will be chunked into `Base64` parts and sent to the agent to be written to disk using the `System.IO.File.WriteAllBytes` class method.
