exports.exit = function(task, command, params){
    C2.postResponse(task, {"completed": true, "user_output": "Exiting"});
    $.NSApplication.sharedApplication.terminate(this);
};
