exports.exit = function(task, command, params){
    return JSON.stringify({"user_output":"Exiting", "completed": true});
    $.NSApplication.sharedApplication.terminate(this);
};
COMMAND_ENDS_HERE