exports.rm = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        let path = command_params['path'];
        let fileManager = $.NSFileManager.defaultManager;
        if(path[0] === '"'){
            path = path.substring(1, path.length-1);
        }
        let error = Ref();
        fileManager.removeItemAtPathError($(path), error);
        return {"user_output":"Removed file", "completed": true, "removed_files": [{"path": path, "host": ""}]};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
