exports.test_password = function(task, command, params){
    ObjC.import("OpenDirectory");
    let session = $.ODSession.defaultSession;
    let sessionType = 0x2201 // $.kODNodeTypeAuthentication
    let recType = $.kODRecordTypeUsers 
    let node = $.ODNode.nodeWithSessionTypeError(session, sessionType, $());
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
    let user = node.recordWithRecordTypeNameAttributesError(recType,$(username), $(), $())
    if(user.js !== undefined){
        if(user.verifyPasswordError($(password),$())){
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
