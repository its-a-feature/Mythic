+++
title = "run"
chapter = false
weight = 100
hidden = false
+++

## Summary

The command uses the ObjectiveC bridge to spawn that process with those arguments on the computer and get your output back. It is not interactive and does not go through a shell, so be sure to specify the full path to the binary you want to run.

     
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### args

- Description: Arguments to pass to the binary   
- Required Value: True  
- Default Value: None  

#### path

- Description: Full path to binary to execute  
- Required Value: True  
- Default Value: None  

## Usage

```
run
```

## MITRE ATT&CK Mapping

- T1106  
## Detailed Summary
```JavaScript
let pipe = $.NSPipe.pipe;
let file = pipe.fileHandleForReading;  // NSFileHandle
let task = $.NSTask.alloc.init;
task.launchPath = path; //example '/bin/ps'
task.arguments = args; //example ['ax']
task.standardOutput = pipe;  // if not specified, literally writes to file handles 1 and 2
task.standardError = pipe;
task.launch; // Run the command 'ps ax'
if(args[args.length - 1] !== "&"){
    //if we aren't tasking this to run in the background, then try to read the output from the program
    //  this will hang our main program though for now
    let data = file.readDataToEndOfFile;  // NSData, potential to hang here?
    file.closeFile;
    response = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding).js;
}
```
