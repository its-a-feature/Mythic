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
    alertTop("info", "Loading...");
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline", create_timeline, "POST", data);
}

function create_timeline(response){
    clearAlertTop();
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, please refresh");
        return;
    }
    if(data['status'] != "success"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        alertTop("success", "Successfully created! Download here: <a href=\"{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline/get\" target=\"_blank\">Full Report</a>");
    }
    //window.open("data:application/pdf;base64, " + response);
}
