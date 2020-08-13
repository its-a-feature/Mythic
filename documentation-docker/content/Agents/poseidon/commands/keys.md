+++
title = "keys"
chapter = false
weight = 113
hidden = false
+++

## Summary
Interact with the linux keyring.

  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### command

- Description: Choose a way to interact with keys.  
- Required Value: True  
- Default Value: None  

#### keyword

- Description: Name of the key to search for  
- Required Value: False  
- Default Value: None  

#### typename

- Description: Choose the type of key  
- Required Value: False  
- Default Value: None  

## Usage

```
keys
```


## Detailed Summary

This command uses the golang keyctl package to interact with the Linux keyring. Not implemented for macOS