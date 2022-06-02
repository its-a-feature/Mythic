exports.pwd = function(task, command, params){
    try{
        let fileManager = $.NSFileManager.defaultManager;
        let cwd = fileManager.currentDirectoryPath;
        if(cwd === undefined || cwd === ""){
            return {"user_output":"CWD is empty or undefined", "completed": true, "status": "error"};
        }
        return {"user_output":cwd.js, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
