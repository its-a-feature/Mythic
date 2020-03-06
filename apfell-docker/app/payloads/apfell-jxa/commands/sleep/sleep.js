exports.sleep = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(command_params.hasOwnProperty('interval') && command_params['interval'] > 0){
            C2.interval = command_params['interval'];
        }
        if(command_params.hasOwnProperty('jitter') && command_params['jitter'] >= 0 && command_params['jitter'] <= 100){
            C2.jitter = command_params['jitter'];
        }
        return {"user_output":"Sleep interval updated to " + C2.interval + " and sleep jitter updated to " + C2.jitter, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

COMMAND_ENDS_HERE