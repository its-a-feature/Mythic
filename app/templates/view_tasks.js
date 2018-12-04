//[{callback info, "tasks": [{task info, "responses": [{response info}]}]},
// {callback2, "tasks": [{task_info, "responses": [{response info}]}]}
//]
var tasks_div = new Vue({
    el: '#tasks_div',
    data: {
        callbacks: []
    },
    methods: {
        toggle_response: function(task, index){
            var img = document.getElementById("task" + task.id).nextElementSibling;
            if (img.style.display === "") {
                img.style.display = "none";
            } else {
                img.style.display = "";
            }
        },
        make_active: function(callback){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],make_active_callback,"PUT", {"active":"true"});
        }
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/task_report_by_callback/" , initialize_data_callback, "GET", null);
function initialize_data_callback(response){
    var data = JSON.parse(response);
    if(data['status'] == "success"){
        for(var i = 0; i < data['output'].length; i++){
            Vue.set(tasks_div.callbacks, i, data['output'][i]);
        }
    }
    else{
        alertTop("danger", data['error']);
    }
};
function make_active_callback(response){
    var data = JSON.parse(response);
    if(data['status'] == 'success'){
        for(var i = 0; i < tasks_div.callbacks.length; i++){
            if(tasks_div.callbacks[i].id == data['id']){
                Vue.set(tasks_div.callbacks[i], 'active', data['active']);
                return;
            }
        }
    }
    else{
        alertTop("danger", data['error']);
    }
};