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
    get_keylogging(data);
}
function host_time(){
    var data = {"grouping": "host", "sub_grouping": "time"};
    get_keylogging(data);
}
function user_window(){
    var data = {"grouping": "user", "sub_grouping": "window"};
    get_keylogging(data);
}
function user_time(){
    var data = {"grouping": "user", "sub_grouping": "time"};
    get_keylogging(data);
}
function get_keylogging(data){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/current_operation", keylog_callback, "POST", data);
}
function keylog_callback(response){
    data = JSON.parse(response);
    if(data['status'] == "success"){
        keylog.data['grouping'] = data['grouping'];
        keylog.data['sub_grouping'] = data['sub_grouping'];
        keylog.keylogs = data['keylogs'];
    }
    else{
        alertTop("danger", data['error']);
    }
}