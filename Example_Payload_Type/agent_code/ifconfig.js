exports.ifconfig = function(task, command, params){
    return {"user_output": JSON.stringify(ObjC.deepUnwrap($.NSHost.currentHost.addresses), null, 2), "completed": true};
};

