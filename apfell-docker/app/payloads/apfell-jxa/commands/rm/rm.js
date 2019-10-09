exports.rm = function(task, command, params){
    ObjC.import('Foundation');
    try{
        let fileManager = $.NSFileManager.defaultManager;
        if(params[0] == '"'){
            params = params.substring(1, params.length-1);
        }
        let error = Ref();
        fileManager.removeItemAtPathError($(params), error);
        return JSON.stringify({"user_output":"Removed file", "completed": true});
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE