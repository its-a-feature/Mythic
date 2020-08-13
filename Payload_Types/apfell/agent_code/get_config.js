exports.get_config = function(task, command, params){
    let config = C2.getConfig();
    return {"user_output":config, "completed": true};
};
