document.title="Analytics";
var command_frequencies = new Vue({
    el: '#commandFrequencies',
    data: {
        frequencies: {},
        total_counts: {}
    },
    delimiters: ['[[', ']]']
});
var artifact_overview = new Vue({
    el: '#artifactOverview',
    data: {
        artifacts: {"artifact_counts": {"total_count": 0},
                    "files":{
                    "manual_uploads": {"total_count": 0},
                    "download_files": {"total_count": 0},
                    "upload_files": {"total_count": 0},
                        "screenshots": {'total_count': 0},
                        "payloads": {'total_count': 0},
                    "staged_files": 0
                    }}
    },
    delimiters: ['[[', ']]']
});
var callback_analysis = new Vue({
    el: '#callbackAnalysis',
    data: {
        callbacks: {"hosts": {}, "users": {}}
    },
    delimiters: ['[[', ']]']
});

function update_command_frequencies(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === "success"){
        command_frequencies.frequencies = data['output'];
        let user_count = 0;
        for(let i in data['output']){
            for(let j in data['output'][i]){
                user_count += data['output'][i][j]['total_count'];
            }
            command_frequencies.total_counts[i] = user_count;
            user_count = 0;
        }
    }else{
        alertTop("danger", data['error']);
    }
}
function update_artifact_overview(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === "success"){
        artifact_overview.artifacts = data['output'];
    }else{
        alertTop("danger", data['error']);
    }
}
function update_callback_analysis(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === "success"){
        callback_analysis.callbacks['hosts'] = data['hosts'];
        callback_analysis.callbacks['users'] = data['users'];
    }else{
        alertTop("danger", data['error']);
    }
}

function send_command_frequencies_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/command_frequency", update_command_frequencies, "GET", null);
}
function send_callback_analysis_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/callback_analysis", update_callback_analysis, "GET", null);
}
function send_artifact_overview_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/artifact_overview", update_artifact_overview, "GET", null);
}
send_command_frequencies_data();
send_callback_analysis_data();
send_artifact_overview_data();

