+++
title = "execute_assembly"
chapter = false
weight = 100
hidden = false
+++

## Summary

Execute the entrypoint of a assembly loaded by the `loadassembly` command and redirect the console output back to the Mythic server. 
- Needs Admin: False  
- Version: 1  
- Author: @Airzero24

### Arguments

#### assembly_id

- Description: The assembly file name that has been loaded via the `loadassembly` command
- Required Value: True  
- Default Value: None  

#### args

- Description: Any arguments to send to the executing assembly
- Required Value: False  
- Default Value: None  

## Usage

```
execute_assembly [filename] [assembly arguments]
```

