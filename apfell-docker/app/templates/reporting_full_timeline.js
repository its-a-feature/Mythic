function generate_report(){
    var cmd_output = $( '#cmd_output').is(":checked");
    var strict_time = $( '#strict_time').is(":checked");
    var strict_task = $('#strict_task').is(":checked");
    if(strict_time && strict_task){
        alertTop("danger", "Cannot be both group output and have strict ordering by time", 1);
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
    alertTop("info", "Submitting report generation task...");
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline", create_timeline, "POST", data);
}

function create_timeline(response){
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
        alertTop("success", "Successfully created! Download here: <a href=\"{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + data['agent_file_id'] + "\" target=\"_blank\">Full Report</a>", 0);
        alertTop("success", "Can also be downloaded from the Uploads/Downloads page under Manual uploads", 0);
    }
}

var style_vue = new Vue({
    el: '#full_reporting',
    delimiters: ['[[', ']]'],
    data: {
        cmd_output: false,
        strict_time: false,
        strict_task: true
    }

});