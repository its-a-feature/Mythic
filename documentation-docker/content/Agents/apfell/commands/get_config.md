+++
title = "get_config"
chapter = false
weight = 100
hidden = false
+++

## Summary

Gets the current running config via the C2 class 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
get_config
```

## MITRE ATT&CK Mapping

- T1082  
## Detailed Summary
This returns a lot of information about the current agent and session. The C2 component will vary depending on the C2 that's loaded in, but an example with the HTTP profile:
```JSON
{
  "C2": {
    "baseurl": "http://192.168.205.151",
    "interval": 10,
    "jitter": 23,
    "commands": "test_password, clipboard, shell_elevated, load, persist_launch, shell, upload, spawn_drop_and_execute, exit, persist_emond, download, spawn_download_cradle, terminals_send, jsimport, prompt, cd, hostname, get_config, jsimport_call, persist_folderaction, launchapp, plist, system_info, pwd, current_user, run, chrome_js, security_info, chrome_tabs, ifconfig, iTerm, cat, ls, terminals_read, screenshot, list_users, jscript, list_apps, sleep, chrome_bookmarks, add_user, rm",
    "host_header": "",
    "aes_psk": "blob here"
  },
  "Host": {
    "user": "POSIX username",
    "fullName": "Full Username",
    "ips": [
            // complete IP list here
    ],
    "hosts": [
      // hostnames
    ],
    "environment": {
      // environment variables
    },
    "uptime": //int
    "args": [
      "/usr/bin/osascript",
      "apfell.js"
    ],
    "pid": 9270,
    "apfell_id": "c546fffa-d248-426b-b805-54971663c539",
    "payload_id": "51434eb0-aaa6-49ad-9b25-515cd6d6642b"
  }
}
```

