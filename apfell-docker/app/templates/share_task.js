try{
    var support_scripts = { {{support_scripts}} };
}catch(error){
    alertTop("danger", "Support Scripting error: " + error.toString());
}
try{
    var browser_scripts = { {{browser_scripts}} };
}catch(error){
    alertTop("danger", "Browser Scripting error: " + error.toString());
}


var task_info = new Vue({
    el: '#task_info',
    data: {
        callback: {},
        task: {},
        responses: []
    },
    methods: {
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
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, comment_callback, "DELETE", null);
        },
        update_view: function(){
            this.$forceUpdate();
        }
    },
    delimiters: ['[[',']]']
});
function set_info(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        task_info.callback = data['callback'];
        task_info.task = data['task'];
        task_info.task['use_scripted'] = false;
        task_info.responses = data['responses'];
        if(browser_scripts.hasOwnProperty(data['task']['command_id'])){
            task_info.task.scripted = browser_scripts[data['task']['command_id']](data['task'], data['responses']);
            task_info.task['use_scripted'] = true;
        }
    }
}
function comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        task_info.task.comment = data['task']['comment'];
        task_info.task.comment_operator = data['task']['comment_operator'];
    }
}
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/{{tid}}", set_info, "GET", null);
