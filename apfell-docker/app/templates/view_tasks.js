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
            if(task.hasOwnProperty('responses')){
                this.$delete(task,'responses');
            }
            else{
                var responses = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/by_task/" + task['id']));
                if(responses.hasOwnProperty("status")){
                    alertTop("danger", responses['error']);
                }
                else{
                    for(var i = 0; i < responses.length; i++){
                        responses[i]['response'] = responses[i]['response'].replace(/\\n|\r/g, '\n');
                    }
                    Vue.set(task, 'responses', responses);
                }
            }
        },
        make_active: function(callback){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],make_active_callback,"PUT", {"active":"true"});
        },
        toggle_show_params: function(id){
            var img = document.getElementById("toggle_task" + id).nextElementSibling;
            if (img.style.display === "") {
                img.style.display = "none";
            } else {
                img.style.display = "";
            }
        },
        add_comment: function(task){
            $( '#addCommentTextArea' ).val(task.comment);
            $( '#addCommentModal' ).modal('show');
            $( '#addCommentSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, update_callback_comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, update_callback_comment_callback, "DELETE", null);
        },
        load_tasks: function(callback){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + callback.id , get_callback_tasks_callback, "GET", null);
        }
    },
    delimiters: ['[[', ']]']
});
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
function startwebsocket_callbacks(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            var data = JSON.parse(event.data);
            data['tasks'] = [];
            tasks_div.callbacks.push(data); // just add the new callback info to the list
            // now request that callback's tasks and we can update it
            //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['id'] , get_callback_tasks_callback, "GET", null);
        }
    };
}; startwebsocket_callbacks();
function get_callback_tasks_callback(response){
    if(response != "" && response != undefined){
        var data = JSON.parse(response);
        if(data.length > 0){
            for(var i = 0; i < tasks_div.callbacks.length; i++){
                if(tasks_div.callbacks[i]['id'] == data[0]['callback']){
                    data.forEach(function(x){
                        x['href'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + x.id;
                    });
                    Vue.set(tasks_div.callbacks[i], 'tasks', data);
                    return;
                }
            }
        }
    }

}
function update_callback_comment_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        data = data['task'];
        for(var i = 0; i < tasks_div.callbacks.length; i++){
            if(data['callback'] == tasks_div.callbacks[i]['id']){
                for(var j = 0; j < tasks_div.callbacks[i]['tasks'].length; j++){
                    if(data['id'] == tasks_div.callbacks[i]['tasks'][j]['id']){
                        tasks_div.callbacks[i]['tasks'][j]['comment'] = data['comment'];
                        tasks_div.callbacks[i]['tasks'][j]['comment_operator'] = data['comment_operator'];
                        return;
                    }
                }
            }
        }
    }else{
        alertTop("danger", data['error']);
    }
}