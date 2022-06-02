exports.terminals_send = function(task, command, params){
    let split_params = {"window": 0, "tab": 0, "command": ""};
    try{
        split_params = Object.assign({}, split_params, JSON.parse(params));
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
	let output = "No Command Output";
	try{
		let term = Application("Terminal");
		if(term.running()){
            let window = split_params['window'];
            let tab = split_params['tab'];
            let cmd = split_params['command'];
            term.doScript(cmd, {in:term.windows[window].tabs[tab]});
            output = term.windows[window].tabs[tab].contents();
        }else{
            return {"user_output":"Terminal is not running", "completed": true, "status": "error"};
        }
	}
	catch(error){
		return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
	return {"user_output":output, "completed": true};
};
