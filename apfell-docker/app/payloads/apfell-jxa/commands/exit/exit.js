exports.exit = function(task, command, params){
    $.NSApplication.sharedApplication.terminate(this);
};
COMMAND_ENDS_HERE