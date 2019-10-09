exports.cd = function(task, command, params){
    try{
        let fileManager = $.NSFileManager.defaultManager;
        let success = fileManager.changeCurrentDirectoryPath(params);
        if(success){
            return JSON.stringify({"user_output": "New cwd: " + fileManager.currentDirectoryPath.js, "completed": true});
        }else{
            return JSON.stringify({"user_output": "Failed to change directory", "completed": true, "status": "error"});
        }
    }catch(error){
        return JSON.stringify({"user_output": error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE