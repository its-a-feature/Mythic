var artifacts_table = new Vue({
    el: '#artifacts_table',
    data: {
        artifacts: [],
        base_artifacts: [],
        current_task: "",
        current_artifact: "",
        current_instance: "",
        page_size: 15,
        current_page: 1,
        total_count: 0
    },
    methods: {
        delete_button: function(artifact, index){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/" + artifact.id, remove_artifact, "DELETE", null);
        },
        add_artifact: function(){
            this.current_artifact = "";
            this.current_instance = "";
            $('#newArtifactModal').modal('show');
            $('#newArtifactSubmit').unbind('click').click(function(){
                data = {"artifact_instance": artifacts_table.current_instance,
                        "artifact": artifacts_table.current_artifact};
                if(artifacts_table.current_task != -1 && artifacts_table.current_task != "" && artifacts_table.current_task > 0){
                    data['task_id'] = artifacts_table.current_task;
                }
                 httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/", create_artifact, "POST", data);
                 artifacts_table.current_task = "";
                 artifacts_table.current_artifact = "";
                 artifacts_table.current_instance = "";
            });
        },
        export_artifacts: function(){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks", export_artifacts_callback, "GET", null);
        },
        get_page: function(page){
            filter_query = $('#filter').val();
            if(filter_query == ""){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/" + page + "/" + this.page_size, set_artifact_data_callback, "GET", null);
            }else{
                data = {"search": filter_query, "page": page, "size": this.page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/search", set_artifact_data_callback, "POST", data);
            }

        },
        get_new_page_size: function(){
            page_size = $('#page_size').val();
            filter_query = $('#filter').val();
            if(filter_query != ""){
                data = {"search": filter_query, "page": 1, "size": page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/search", set_artifact_data_callback, "POST", data);
            }else{
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/" + 1 + "/" + page_size, set_artifact_data_callback, "GET", null);
            }

            this.page_size = page_size;
        },
        filter: function(){
            filter_query = $('#filter').val();
            data = {"search": filter_query, "size": this.page_size, "page": 1};
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/search", set_artifact_data_callback, "POST", data);
            this.current_page = 1;
        }
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifact_tasks/1/15", set_artifact_data_callback, "GET", null);
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifacts/", set_base_artifact_data_callback, "GET", null);
function set_artifact_data_callback(response){
    try{
        data = JSON.parse(response);
        //console.log(data);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error'], 2);
    }else{
        artifacts_table.artifacts = [];
         for(t in data['tasks']){
            data['tasks'][t]['task_href'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['tasks'][t]['task_id'];
            artifacts_table.artifacts.push(data['tasks'][t]);
         }
         artifacts_table.total_count = data['total_count'];
         artifacts_table.current_page = data['page'];
         artifacts_table.page_size = data['size'];
    }
}
function set_base_artifact_data_callback(response){
    try{
        data = JSON.parse(response);
        //console.log(data);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }else{
        artifacts_table.base_artifacts = data['artifacts'];
        artifacts_table.base_artifacts.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
    }
}
function export_artifacts_callback(response){
    try{
        data = JSON.parse(response);
        //console.log(data);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }else{
         download_from_memory("artifacts.json", btoa(response));
    }
}
function create_artifact(response){
    try{
        data = JSON.parse(response);
        //console.log(data);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
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