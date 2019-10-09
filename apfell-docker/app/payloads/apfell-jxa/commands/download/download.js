exports.download = function(task, command, params){
    let output = C2.download(task, params);
    return JSON.stringify(output);
};
COMMAND_ENDS_HERE