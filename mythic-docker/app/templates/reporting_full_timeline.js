document.title = "Reporting Timelines";
function generate_pdf_report(){
    generate_report("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline_pdf");
}
function generate_json_report(){
    generate_report("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/reporting/full_timeline_json");
}
function generate_report(url){
    let data = {};
    data['cmd_output'] = style_vue.cmd_output;
    data['stict'] = style_vue.order;
    data['artifacts'] = style_vue.artifacts;
    data['attack'] = style_vue.attack;
    alertTop("info", "Submitting report generation task...", 0);
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
        alertTop("success", "Download here: <a style='color:darkblue' href=\"{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + data['agent_file_id'] + "\" target=\"_blank\">Full Report</a>",
            0, "Successfully created!", false);
    }
}

var style_vue = new Vue({
    el: '#full_reporting',
    delimiters: ['[[', ']]'],
    data: {
        cmd_output: false,
        order: "task",
        artifacts: false,
        attack: false
    }

});