function generate_report(){
    var cmd_output = $( '#cmd_output').is(":checked");
    var strict_time = $( '#strict_time').is(":checked");
    var strict_task = $('#strict_task').is(":checked");
    if(strict_time && strict_task){
        alert("Cannot be both group output and have strict ordering by time");
        return;
    }
    var data = {};
    data['cmd_output'] = cmd_output;
    if(strict_time){
        data['strict'] = "time";
    }
    else if(strict_task){
        data['strict'] = "task";
    }
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline", download_timeline, "POST", data);
}

function download_timeline(response){
}