exports.exit = function(task, command, params){
    ObjC.import("AppKit");
    C2.postResponse(task, {"completed": true, "user_output": "Exiting"});
    $.NSApplication.sharedApplication.terminate($.nil);
    $.NSThread.exit();
};
