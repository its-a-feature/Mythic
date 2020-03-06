document.title = "Reporting Timelines";
function generate_pdf_report(){
    generate_report("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline_pdf");
}
function generate_json_report(){
    generate_report("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline_json");
}
function generate_report(url){
    if(style_vue.strict_time && style_vue.strict_task){
        alertTop("warning", "Cannot be both group output and have strict ordering by time");
        return;
    }
    let data = {};
    data['cmd_output'] = style_vue.cmd_output;
    if(style_vue.strict_time){
        data['strict'] = "time";
    }
    else if(style_vue.strict_task){
        data['strict'] = "task";
    }
    data['artifacts'] = style_vue.artifacts;
    data['attack'] = style_vue.attack;
    alertTop("info", "Submitting report generation task...");
    httpGetAsync(url, create_timeline, "POST", data);
}
function create_timeline(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, please refresh");
        return;
    }
    if(data['status'] !== "success"){
        alertTop("danger", data['error']);
    }
    else{
        alertTop("success", "Successfully created! Download here: <a style='color:darkblue' href=\"{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + data['agent_file_id'] + "\" target=\"_blank\">Full Report</a>", 0);
        alertTop("success", "Can also be downloaded from the Services -> Host Files page under Manual uploads", 0);
    }
}

var style_vue = new Vue({
    el: '#full_reporting',
    delimiters: ['[[', ']]'],
    data: {
        cmd_output: false,
        strict_time: false,
        strict_task: true,
        artifacts: false,
        attack: false
    }

});