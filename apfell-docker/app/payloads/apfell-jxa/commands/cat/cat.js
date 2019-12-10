exports.cat = function(task, command, params){
    try{
        let contents = $.NSString.stringWithContentsOfFileEncodingError($(params), $.NSUTF8StringEncoding, $());
        if(contents === undefined || contents === ""){
            return JSON.stringify({"user_output": "No output from command", "completed": true});
        }
        if(contents === true){
            return JSON.stringify({"user_output": "True", "completed": true});
        }
        if(contents === false){
            return JSON.stringify({"user_output": "False", "completed": true});
        }
        return JSON.stringify({"user_output": contents, "completed": true});
    }
    catch(error){
        return JSON.stringify({"user_output": error.toString(), "status": "error", "completed": true});
    }
};
COMMAND_ENDS_HERE