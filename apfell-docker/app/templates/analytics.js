
var process_new_callbacks = false;
var callback_tree = new Vue({
	el: '#callbacktree',
	data: {
		callback_tree_data: "",
        show_removed: false,
        show_strikethrough: false
	},
	delimiters: ['[[',']]']
});
var pload_tree = new Vue({
    el: '#payloadtree',
    data: {
        payload_tree_data: "",
        show_removed: false,
        show_strikethrough: false
    },
    delimiters: ['[[', ']]']
});
var command_frequencies = new Vue({
    el: '#commandFrequencies',
    data: {
        frequencies: {},
        total_counts: {}
    },
    delimiters: ['[[', ']]']
});
var artifact_analysis = new Vue({
    el: '#artifactAnalysis',
    data: {
        artifacts: {}
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
                    "staged_files": 0
                    }}
    },
    delimiters: ['[[', ']]']
});
var callback_analysis = new Vue({
    el: '#callbackAnalysis',
    data: {
        callbacks: {}
    },
    delimiters: ['[[', ']]']
});


function update_callback_tree(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        //$( '#callbacktree' ).html(data['output']);
        callback_tree.callback_tree_data = data['output'];
    }else{
        alertTop("danger", data['error']);
    }

}
function update_payload_tree(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
         pload_tree.payload_tree_data = data['output'];
    }else{
        alertTop("danger", data['error']);
    }
}
function update_command_frequencies(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        command_frequencies.frequencies = data['output'];
        user_count = 0;
        for(i in data['output']){
            for(j in data['output'][i]){
                user_count += data['output'][i][j]['total_count'];
            }
            command_frequencies.total_counts[i] = user_count;
            user_count = 0;
        }
    }else{
        alertTop("danger", data['error']);
    }
}
function update_artifact_analysis(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        artifact_analysis.artifacts = data['output'];

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
    if(data['status'] == "success"){
        artifact_overview.artifacts = data['output'];
        //console.log(artifact_overview.artifacts);

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
    if(data['status'] == "success"){
        callback_analysis.callbacks = data['output'];
        //console.log(data['output']);
        for(i in callback_analysis.callbacks['host']){
            callback_analysis.callbacks['host'][i].sort((a,b) =>(b.id > a.id) ? -1 : ((a.id > b.id) ? 1 : 0));
        }
        for(i in callback_analysis.callbacks['date']){
            callback_analysis.callbacks['date'][i].sort((a,b) =>(b.id > a.id) ? -1 : ((a.id > b.id) ? 1 : 0));
        }

    }else{
        alertTop("danger", data['error']);
    }
}

function show_removed_button(){
    callback_tree.show_removed = !callback_tree.show_removed;
    send_callback_tree_data();
}
function show_removed_strike_button(){
    callback_tree.show_strikethrough = !callback_tree.show_strikethrough;
    send_callback_tree_data();
}
function show_removed_payload_button(){
    pload_tree.show_removed = !pload_tree.show_removed;
    send_pload_tree_data();
}
function show_removed_payload_strike_button(){
    pload_tree.show_strikethrough = !pload_tree.show_strikethrough;
    send_pload_tree_data();
}

function send_callback_tree_data(){
    if(callback_tree.show_removed || callback_tree.show_strikethrough){
        var data = {};
        data['inactive'] = callback_tree.show_removed;
        data['strikethrough'] = callback_tree.show_strikethrough;
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/callback_tree", update_callback_tree, "POST", data);
    }
    else{
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/callback_tree", update_callback_tree, "GET", null);
    }
}
function send_pload_tree_data(){
    if(pload_tree.show_removed || pload_tree.show_strikethrough){
        var data = {};
        data['inactive'] = pload_tree.show_removed;
        data['strikethrough'] = pload_tree.show_strikethrough;
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/payload_tree", update_payload_tree, "POST", data);
    }
    else{
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/payload_tree", update_payload_tree, "GET", null);
    }
}
function send_command_frequencies_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/command_frequency", update_command_frequencies, "GET", null);
}
function send_artifacts_analysis_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/artifact_creation_analysis", update_artifact_analysis, "GET", null);
}
function send_callback_analysis_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/callback_analysis", update_callback_analysis, "GET", null);
}
function send_artifact_overview_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/artifact_overview", update_artifact_overview, "GET", null);
}

send_pload_tree_data();
send_callback_tree_data();
send_command_frequencies_data();
send_artifacts_analysis_data();
send_callback_analysis_data();
send_artifact_overview_data();

var adjustCallbackRelationshipModal_Vue = new Vue({
    el: '#adjustCallbackRelationshipModal',
    data: {
        callbacks: [],
        parent: -1,
        child: -1
    },
    delimiters: ['[[',']]']
});
function adjust_callback_relationship_button(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/", list_possible_callbacks_callback, "GET", null);
    $( '#adjustCallbackRelationshipModal' ).modal('show');
    $( '#adjustCallbackRelationshipSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + adjustCallbackRelationshipModal_Vue.child, relationship_adjust_callback, "PUT", {'parent': adjustCallbackRelationshipModal_Vue.parent});
    });
}
function list_possible_callbacks_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
     adjustCallbackRelationshipModal_Vue.callbacks = data;
     adjustCallbackRelationshipModal_Vue.child = adjustCallbackRelationshipModal_Vue.callbacks[0].id;

}
function relationship_adjust_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        alertTop("success", "Successfully edited callback relationship");
    }else{
        alertTop("danger", data['error']);
    }
}

