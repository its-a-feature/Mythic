exports.current_user = function(task, command, params){
    try{
        let method = "api";
        if(params.length > 0){
            let data = JSON.parse(params);
            if(data.hasOwnProperty('method') && data['method'] !== ""){
                method = data['method'];
            }
        }
        if(method === "jxa"){
            let user = Application("System Events").currentUser;
            let info = "Name: " + user.name() +
            "\nFullName: " + user.fullName() +
            "\nhomeDirectory: " + user.homeDirectory() +
            "\npicturePath: " + user.picturePath();
            return {"user_output":info, "completed": true};
        }
        else if(method === "api"){
            let output = "\nUserName: " + $.NSUserName().js +
            "\nFull UserName: " + $.NSFullUserName().js +
            "\nHome Directory: " + $.NSHomeDirectory().js;
            return {"user_output":output, "completed": true};
        }
        else{
            return {"user_output":"Method not supported", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
