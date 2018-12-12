var search_results = new Vue({
    el: '#searchResults',
    data:{
        responses: []
    },
    delimiters: ['[[', ']]']
});
function search_task_output(){
    var search = $( '#searchTextField' ).val();
    if(search != ""){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/search", get_search_callback, "POST", {"search": search});
    }
    else{
        alertTop("warning", "Need to actually type something to search for...");
    }

}
function get_search_callback(response){
    var data = JSON.parse(response);
    var search = $( '#searchTextField' ).val();
    if(data['status'] == 'success'){
        console.log(data);
        for(var i = 0; i < data['output'].length; i++){
            data['output'][i]['response'] = data['output'][i]['response'].replace(/\\n|\r/g, '\n');
        }
        search_results.responses = data['output'];
    }
    else{
        alertTop("danger", data['error']);
    }
}