var artifacts_table = new Vue({
    el: '#artifacts_table',
    data: {
        artifacts: []
    },
    methods: {
        delete_button: function(artifact, index){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/" + artifact.id, remove_artifact, "DELETE", null);
        }
    },
    delimiters: ['[[', ']]']
});

// get initial artifacts
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks", initialize_artifacts, "GET", null);
function initialize_artifacts(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        for(var i = 0; i < data['tasks'].length; i++){
            data['tasks'][i]['task_href'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['tasks'][i]['id'];
        }
        artifacts_table.artifacts = data['tasks'];
    }else{
        alertTop("danger", data['error']);
    }
}
function remove_artifact(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        for(var i = 0; i < artifacts_table.artifacts.length; i++){
            if(data['id'] == artifacts_table.artifacts[i]['id']){
                artifacts_table.artifacts.splice(i, 1);
                return;
            }
        }
    }else{
        alertTop("danger", data['error']);
    }
}