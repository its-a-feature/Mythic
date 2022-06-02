exports.security_info = function(task, command, params){
    try{
        let secObj = Application("System Events").securityPreferences();
        let info = "automaticLogin: " + secObj.automaticLogin() +
        "\nlogOutWhenInactive: " + secObj.logOutWhenInactive() +
        "\nlogOutWhenInactiveInterval: " + secObj.logOutWhenInactiveInterval() +
        "\nrequirePasswordToUnlock: " + secObj.requirePasswordToUnlock() +
        "\nrequirePasswordToWake: " + secObj.requirePasswordToWake();
        //"\nsecureVirtualMemory: " + secObj.secureVirtualMemory(); //might need to be in an elevated context
        return {"user_output":info, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
