var searches_Vue = new Vue({
    el: '#searches',
    data:{
        option: "output"
    },
    methods:{
        search_button: function(){
            if(this.option == "output"){
                search_task_output();
            }
            else{
                search_task_params();
            }
        }
    },
    delimiters: ['[[', ']]']
})
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
        search_results.responses = [];
        search_task_results.tasks = [];
        setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                // show loading data until we load all of our data in, then it will be automatically cleared
                alertTop("success", "Loading data");
            }, 0);
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/search", get_search_callback, "POST", {"search": search});
    }
    else{
        alertTop("warning", "Need to actually type something to search for...");
    }

}
function get_search_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        for(var i = 0; i < data['output'].length; i++){
            data['output'][i]['share_task'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['output'][i]['task']['id'];
            data['output'][i]['response'] = data['output'][i]['response'].replace(/\\n|\r/g, '\n');
        }
        search_results.responses = data['output'];
        setTimeout(() => { // setTimeout to put this into event queue
            // executed after render
            clearAlertTop();
        }, 0);
    }
    else{
        alertTop("danger", data['error']);
    }
}
var search_task_results = new Vue({
    el: '#searchTasksResults',
    data:{
        tasks: []
    },
    delimiters: ['[[', ']]']
});
function search_task_params(){
    var search = $( '#searchTextField' ).val();
    if(search != ""){
        search_results.responses = [];
        search_task_results.tasks = [];
        setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                // show loading data until we load all of our data in, then it will be automatically cleared
                alertTop("success", "Loading data");
            }, 0);
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/search", get_search_tasks_callback, "POST", {"search": search});
    }
    else{
        alertTop("warning", "Need to actually type something to search for...");
    }
}
function get_search_tasks_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        for(var i = 0; i < data['output'].length; i++){
            data['output'][i]['share_task'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['output'][i]['id'];
        }
        search_task_results.tasks = data['output'];
        setTimeout(() => { // setTimeout to put this into event queue
            // executed after render
            clearAlertTop();
        }, 0);
    }
    else{
        alertTop("danger", data['error']);
    }
}