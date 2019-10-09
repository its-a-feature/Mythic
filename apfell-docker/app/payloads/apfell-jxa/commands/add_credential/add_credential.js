exports.add_credential = function(task, command, params){
	return JSON.stringify({"credentials": [JSON.parse(params)], "completed": true});
};
COMMAND_ENDS_HERE
    