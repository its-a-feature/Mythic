+++
title = "hostname"
chapter = false
weight = 100
hidden = false
+++

## Summary

Get the various hostnames associated with the host, including the NETBIOS name if the computer is domain joined 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
hostname
```


## Detailed Summary
This uses various API calls and files to pull the various hostnames associated with the computer:
```JavaScript
let output = {};
output['localized'] = ObjC.deepUnwrap($.NSHost.currentHost.localizedName);
output['names'] = ObjC.deepUnwrap($.NSHost.currentHost.names);
let fileManager = $.NSFileManager.defaultManager;
if(fileManager.fileExistsAtPath("/Library/Preferences/SystemConfiguration/com.apple.smb.server.plist")){
	let dict = $.NSMutableDictionary.alloc.initWithContentsOfFile("/Library/Preferences/SystemConfiguration/com.apple.smb.server.plist");
	let contents = ObjC.deepUnwrap(dict);
	output['Local Kerberos Realm'] = contents['LocalKerberosRealm'];
	output['NETBIOS Name'] = contents['NetBIOSName'];
	output['Server Description'] = contents['ServerDescription'];
}
```
This has been a particular painpoint for the agent to determine which hostname to report back on checkin. This at least exposes all the options.
