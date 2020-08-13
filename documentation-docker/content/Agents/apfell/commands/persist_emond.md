+++
title = "persist_emond"
chapter = false
weight = 100
hidden = false
+++

## Summary

Create persistence with an emond plist file in /etc/emond.d/rules/ and a .DS_Store file to trigger it 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### rule_name

- Description: Rule name for inside of the plist  
- Required Value: True  
- Default Value: None  

#### payload_type

- Description: A choice of payload within the plist ("oneliner-jxa", "custom_bash-c") 
- Required Value: True  
- Default Value: None  

#### url

- Description: url of payload for oneliner-jxa  (this will do a download cradle with this URL)
- Required Value: False  
- Default Value: None  

#### command

- Description: Command if type is custom_bash-c  (execute a command via `/bin/bash -c`)
- Required Value: False  
- Default Value: None  

#### file_name

- Description: Name of plist in /etc/emond.d/rules/  
- Required Value: True  
- Default Value: None  

## Usage

```
persist_emond
```

## MITRE ATT&CK Mapping

- T1150  
## Detailed Summary
This technique follows the post by @xorrior on his [blog](https://www.xorrior.com/emond-persistence/)

