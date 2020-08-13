+++
title = "prompt"
chapter = false
weight = 100
hidden = false
+++

## Summary

Create a custom prompt to ask the user for credentials where you can provide titles, icons, text and default answer
     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### title

- Description: Title of the dialog box  
- Required Value: False  
- Default Value: Application Needs to Update  

#### icon

- Description: full path to .icns file to use  
- Required Value: False  
- Default Value: "/System/Library/CoreServices/Software Update.app/Contents/Resources/SoftwareUpdate.icns"  

#### text

- Description: additional descriptive text to display  
- Required Value: False  
- Default Value: An application needs permission to update  

#### answer

- Description: Default answer to pre-populate  
- Required Value: False  
- Default Value: None  

## Usage

```
prompt
```

## MITRE ATT&CK Mapping

- T1141  
## Detailed Summary

Uses JXA to issue a prompt to the user and returns the information they supply:
```JavaScript
let prompt = currentApp.displayDialog(text, {
			defaultAnswer: answer,
			buttons: ['OK', 'Cancel'], 
			defaultButton: 'OK',
			cancelButton: 'Cancel', 
			withTitle: title,  
			withIcon: Path(icon),
			hiddenAnswer: true 
		});
return {"user_output":prompt.textReturned, "completed": true};
```
