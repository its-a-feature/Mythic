exports.cd = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(!command_params.hasOwnProperty('path')){return {"user_output": "Missing path parameter", "completed": true, "status": "error"}}
        let fileManager = $.NSFileManager.defaultManager;
        let success = fileManager.changeCurrentDirectoryPath(command_params['path']);
        if(success){
            return {"user_output": "New cwd: " + fileManager.currentDirectoryPath.js, "completed": true};
        }else{
            return {"user_output": "Failed to change directory", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output": error.toString(), "completed": true, "status": "error"};
    }
};
