var artifacts_table = new Vue({
    el: '#artifacts_table',
    delimiters: ['[[', ']]'],
    data:{
        artifacts: []
    },
    methods: {
        delete_button: function(index){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifacts/" + this.artifacts[index].id,
                delete_button_callback, "DELETE", null);
        },
        edit_button: function(index){
            $( '#editArtifactName').val(this.artifacts[index].name);
            $( '#editArtifactDescription').val(this.artifacts[index].description);
            $( '#editArtifactModal' ).modal('show');
            $( '#editArtifactSubmit' ).unbind('click').click(function(){
                var name = $( '#editArtifactName' ).val();
                var description = $( '#editArtifactDescription' ).val();
                //should have all the data we need, submit the POST request
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifacts/" + artifacts_table.artifacts[index].id,
                    edit_button_callback, "PUT", {'name': name, 'description': description});
            });
        }
    }
});
function delete_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        // find that right row and delete it
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
function edit_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        // find the right spot in the array and update the data
        for(var i = 0; i < artifacts_table.artifacts.length; i++){
            if(data['id'] == artifacts_table.artifacts[i]['id']){
                Vue.set(artifacts_table.artifacts, i, data);
                return;
            }
        }
    }else{
        alertTop("danger", data['error']);
    }
}
function new_artifact_button(){
    $( '#newArtifactName').val('');
    $( '#newArtifactDescription').val('');
    $( '#newArtifactModal' ).modal('show');
    $( '#newArtifactSubmit' ).unbind('click').click(function(){
        var name = $( '#newArtifactName' ).val();
        var description = $( '#newArtifactDescription' ).val();
        //should have all the data we need, submit the POST request
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifacts",
        new_artifact_button_callback, "POST", {'name': name, 'description': description});
    });
}
function new_artifact_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        artifacts_table.artifacts.push(data);
    }else{
        alertTop("danger", data['error']);
    }
}
// get initial artifacts
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/artifacts",
            initialize_artifacts, "GET", null);
function initialize_artifacts(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        artifacts_table.artifacts = data['artifacts'];
    }else{
        alertTop("danger", data['error']);
    }
}