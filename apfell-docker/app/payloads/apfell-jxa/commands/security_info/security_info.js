exports.security_info = function(task, command, params){
    try{
        let method = "jxa";
        if(params.length > 0){
            let data = JSON.parse(params);
            if(data.hasOwnProperty('method') && data['method'] !== ""){
                method = data['method'];
            }
        }
        if(method === "jxa"){
            let secObj = Application("System Events").securityPreferences();
            let info = "automaticLogin: " + secObj.automaticLogin() +
            "\nlogOutWhenInactive: " + secObj.logOutWhenInactive() +
            "\nlogOutWhenInactiveInterval: " + secObj.logOutWhenInactiveInterval() +
            "\nrequirePasswordToUnlock: " + secObj.requirePasswordToUnlock() +
            "\nrequirePasswordToWake: " + secObj.requirePasswordToWake();
            //"\nsecureVirtualMemory: " + secObj.secureVirtualMemory(); //might need to be in an elevated context
            return {"user_output":info, "completed": true};
        }
        else{
            return {"user_output":"Method not known", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
COMMAND_ENDS_HERE