+++
title = "list_apps"
chapter = false
weight = 100
hidden = false
+++

## Summary

This uses NSApplication.RunningApplications api to get information about running applications. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
list_apps
```

## MITRE ATT&CK Mapping

- T1057  
## Detailed Summary
This is different than executing `ps` in a terminal since this only reports back running applications, not _all_ processes running on a system.
```JavaScript
let procs = $.NSWorkspace.sharedWorkspace.runningApplications.js;
for(let i = 0; i < procs.length; i++){
    let info = {};
    info['frontMost'] = procs[i].active;
    info['hidden'] = procs[i].hidden;
    info['bundle'] = procs[i].bundleIdentifier.js;
    info['bundleURL'] = procs[i].bundleURL.path.js;
    info['bin_path'] = procs[i].executableURL.path.js;
    info['process_id'] = procs[i].processIdentifier;
    info['name'] = procs[i].localizedName.js;
    if(procs[i].executableArchitecture === "16777223"){
        info['architecture'] = "x64";
    }
    else if(procs[i].executableArchitecture === "7"){
        info['architecture'] = "x86";
    }
    else if(procs[i].executableArchitecture === "18"){
        info['architecture'] = "x86_PPC";
    }
    else if(procs[i].executableArchitecture === "16777234"){
        info['architecture'] = "x86_64_PPC";
    }
    names.push(info);
}
```

This output is turned into a sortable table via a browserscript that by default highlights:
- Little Snitch
- Terminal
- 1Password
- Slack

