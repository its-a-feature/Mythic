+++
title = "Development"
chapter = false
weight = 20
pre = "<b>3. </b>"
+++

## Development Environment

Unfortunately there isn't a single great environment for doing JXA development. When testing individual components, you can use the native REPL (Read Eval Print Loop) style to do a single command at a time (`osascript -l JavaScript -i`). Things also drastically change between macOS versions, so be sure to test your code on any that you anticipate encountering. 

You can use the majority of normal JavaScript functionality except for things that interact with the DOM or browser specific features.

The [JXA Cookbook](https://github.com/JXA-Cookbook/JXA-Cookbook/wiki) has great resources and examples for doing a lot of stuff with JXA.
There's also a [groups](https://apple-dev.groups.io/g/jxa/wiki/3202) page with some useful (although dated) references.

## Adding Commands

Commands are located in `Payload_Types/apfell/agent_code/` and have a `.js` extension. The general format for commands is:

```JavaScript
exports.command_name = function(task, command, params){
    //ObjC.import('AppKit'); //do any command-specific imports you might need
    //task is a JSON dictionary of information about the task
    //command is the command name
    //params is a STRING of the parameters
    //    if you actually sent a JSON blob, then you need to do:
    //    let json_params = JSON.parse(params);
    return {"user_output": "hey, I ran!", "completed": true, "status": "success"};
};
```
where `command_name` is the name of the command you'd type in the UI. 

### Available Components within Commands

Inside of commands, you get access to certain extra functions and information that's part of the agent overall and the C2 profile.
- `C2` - this class gives access to all of the C2's methods in case you want to call one of them directly. A good example of this is if you want to pull down a file from Mythic `let file = C2.upload(task, config['template'], temp_file);`.
  - The `upload` function within `C2` takes the task, the file_id you want to pull down, and if you're going to be writing that file to disk, the full path of where it goes. This last piece is so that Mythic can properly track where the file is being written since it might not always be known ahead of time (i.e. randomized or relative paths). The naming convention here seems backwards at first, but to keep things consistent, all naming is from the perspective of the operator. So, and `upload` function is uploading it from the operator/Mythic to the agent whereas `download` is going from agent to operator/Mythic.
- `apfell` - this is the instantiation of the agent class with all of the pieces you're familiar with for the base agent info:
```JavaScript
class agent{
	constructor(){
		this.procInfo = $.NSProcessInfo.processInfo;
		this.hostInfo = $.NSHost.currentHost;
		this.id = "";
		this.user = ObjC.deepUnwrap(this.procInfo.userName);
		this.fullName = ObjC.deepUnwrap(this.procInfo.fullUserName);
		//every element in the array needs to be unwrapped
		this.ip = ObjC.deepUnwrap(this.hostInfo.addresses); //probably just need [0]
		this.pid = this.procInfo.processIdentifier;
		//every element in the array needs to be unwrapped
		this.host = ObjC.deepUnwrap(this.hostInfo.names); //probably just need [0]
		//this is a dictionary, but every 'value' needs to be unwrapped
		this.environment = ObjC.deepUnwrap(this.procInfo.environment);
		this.uptime = this.procInfo.systemUptime;
		//every element in the array needs to be unwrapped
		this.args = ObjC.deepUnwrap(this.procInfo.arguments);
		this.osVersion = this.procInfo.operatingSystemVersionString.js;
		this.uuid = "UUID_HERE";
	}
}
var apfell = new agent();
```
  - you can access any of these pieces within your functions if necessary.


## Modifying base agent behavior

The base code for the agent is lcoated in `Payload_types/apfell/agent_code/base/apfell-jxa.js`. This contains the information about the apfell agent that's report back for checkin (such as username, hostname, agent uuid, etc). This also contains the main tasking loop at the bottom.

## Adding C2 Profiles

C2 profiles are located in their own folder in `Payload_Types/apfell/agent_code/c2_profiles` each with their own `.js` file. These are separated out so it's easy to find during payload creation.
- You can do pretty much whatever you want for these, but you should expose the `upload` and `download` functions in the same fashion as the `HTTP` profile so that it's easy to swap between C2 profiles.
- The main thing you need to do is declare your c2 instance at the bottom like `var C2 = new customC2(callback_interval, "callback_host:callback_port/");` so that commands and other functions can access these functions via the `C2` variable.
