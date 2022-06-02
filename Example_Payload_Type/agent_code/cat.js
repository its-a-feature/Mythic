exports.cat = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(!command_params.hasOwnProperty('path')){return {"user_output": "Missing path parameter", "completed": true, "status": "error"}}
        let contents = $.NSString.stringWithContentsOfFileEncodingError($(command_params['path']), $.NSUTF8StringEncoding, $()).js;
        if(contents === ""){
            return {"user_output": "No output from command", "completed": true};
        }
        else if(contents === true){
            return {"user_output": "True", "completed": true};
        }
        else if(contents === false){
            return{"user_output": "False", "completed": true};
        }
        else if(contents === undefined){
            return {"user_output": "Failed to read file. Either you don't have permissions or the file doesn't exist", "completed": true, "status": "error"};
        }
        return {"user_output": contents, "completed": true};
    }
    catch(error){
        return {"user_output": error.toString(), "status": "error", "completed": true};
    }
};
