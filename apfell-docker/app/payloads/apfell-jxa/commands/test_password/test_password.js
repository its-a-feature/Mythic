exports.test_password = function(task, command, params){
    ObjC.import('Collaboration');
    ObjC.import('CoreServices');
    let authority = $.CBIdentityAuthority.defaultIdentityAuthority;
    let username = apfell.user;
    let password = "";
    if(params.length > 0){
        let data = JSON.parse(params);
        if(data.hasOwnProperty('username') && data['username'] !== ""){
            username = data['username'];
        }
        if(data.hasOwnProperty('password') && data['password'] !== ""){
            password = data['password'];
        }
        // if no password is supplied, try an empty password
    }
    let user = $.CBIdentity.identityWithNameAuthority($(username), authority);
    if(user.js !== undefined){
        if(user.authenticateWithPassword($(password))){
            return {"user_output":"Successful authentication", "completed": true};
        }
        else{
            return {"user_output":"Failed authentication", "completed": true};
        }
    }
    else{
        return {"user_output":"User does not exist", "completed": true, "status": "error"};
    }
};
COMMAND_ENDS_HERE