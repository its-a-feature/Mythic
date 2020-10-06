+++
title = "poseidon"
chapter = false
weight = 5
+++
![logo](/agents/poseidon/poseidon.svg?width=200px)
## Summary

Poseidon is a Golang cross-platform (macOS & Linux) post-exploitation agent that leverages CGO for OS-specific API calls. 

### Highlighted Agent Features
- Websockets protocol for C2
- Socks5 in agent proxy capability
- In-memory JavaScript for Automation execution
- XPC Capability for IPC messages
- Optional HMAC+AES with EKE for encrypted comms

### Compilation Information
This payload type uses golang to cross-compile into various platforms with the help of cgo and xgo

There are two options for file types when building a poseidon payload
- The default option produces an executable for the selected operating system
- The c-archive option produces an archive file that can be used with sharedlib-darwin-linux.c to compile a shared object file for Linux or dylib for macOS.

Building a SO/Dylib File
- In the payload type information section of the payload creation page, please select the c-archive buildmode option.
- The resulting payload file should be a zip archive. This contains the golang archive file and header for poseidon. Copy the sharedlib-darwin-linux.c file to the folder with the golang archive files. 
- Edit sharedlib-darwin-linux.c and change the include statement on line 7 to match the name of the golang archive header file.
- Use clang to compile a dylib on macOS: clang -shared -framework Foundation -framework CoreGraphics -framework Security -fpic sharedlib-darwin-linux.c golangarchive.a -o payload.dylib
- Note you may need to execute ranlib against the archive file before compiling.

## Authors
- @xorrior
- @djhohnstein
