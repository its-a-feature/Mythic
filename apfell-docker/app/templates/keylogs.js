var keylogs = {};
var data = {};
var keylog = new Vue({
    el: '#keylog_div',
    delimiters: ['[[',']]'],
    data: {
        keylogs,
        data
    }
});
function host_window(){
    var data = {"grouping": "host", "sub_grouping": "window"};
    alertTop("info", "Getting keylogs...");
    get_keylogging(data);
}
host_window();
function user_window(){
    var data = {"grouping": "user", "sub_grouping": "window"};
    alertTop("info", "Getting keylogs...");
    get_keylogging(data);
}
function get_keylogging(data){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/current_operation", keylog_callback, "POST", data);
}
function keylog_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        //console.log(data['keylogs']);
        keylog.data['grouping'] = data['grouping'];
        keylog.data['sub_grouping'] = data['sub_grouping'];
        keylog.keylogs = data['keylogs'];
    }
    else{
        alertTop("danger", data['error']);
    }
}