/* eslint-disable no-unused-vars */
// this is called from within browser_scripts functions, not directly
var support_scripts = {};
/* eslint-enable no-unused-vars */
var browser_scripts = {}
try {
    eval(atob(" {{support_scripts}} "));
} catch (error) {
    alertTop("danger", "Support Scripting error: " + error.toString());
}
try {
    eval(atob(" {{browser_scripts}} "));
} catch (error) {
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
            let img = document.getElementById("toggle_task" + id).nextElementSibling;
            if (img.style.display === "") {
                img.style.display = "none";
            } else {
                img.style.display = "";
            }
        },
        toggle_comment: function(task){
            if(task.comment_visible){
                Vue.set(task, 'comment_visible', false);
            }else{
                Vue.set(task, 'comment_visible', true);
            }
        },
        toggle_arrow: function(task){
            $('#cardbody' + task.id).unbind('shown.bs.collapse').on('shown.bs.collapse', function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + task.id, (response)=>{
                     try{
                         let data = JSON.parse(response);
                         task.response = data['responses'];
                         if(task['command_id'] in browser_scripts){
                            task['use_scripted'] = true;
                            task['scripted'] = browser_scripts[task['command_id']](task, Object.values(task['response']));
                        }
                        task_info.$forceUpdate();
                     }catch(error){
                         alertTop("danger", "Session expired, please refresh");
                     }
                 }, "GET", null);
                $('#color-arrow' + task.id).removeClass('fa-plus').addClass('fa-minus');
            });
            $('#cardbody' + task.id).unbind('hidden.bs.collapse').on('hidden.bs.collapse', function(){
                $('#color-arrow' + task.id).removeClass('fa-minus').addClass('fa-plus');
            });
        },
        add_comment: function(task){
            $( '#addCommentTextArea' ).val(task.comment);
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
                $("#addCommentTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13) {
                        $( '#addCommentSubmit' ).click();
                    }
                });
            });
            $( '#addCommentModal' ).modal('show');
            $( '#addCommentSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        download_raw_output: function(taskid){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid + "/raw_output", (response)=>{
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        download_from_memory("task_" + taskid + ".txt", data['output']);
                    }else{
                        alertTop("warning", data['error']);
                    }
                }catch(error){
                    alertTop("danger", "Session expired, please refresh");
                    console.log(error.toString());
                }
            }, "GET", null);

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
        let data = JSON.parse(response);
        if(data['status'] === "error"){
            alertTop("danger", data['error']);
        }
        else{
            task_info.callback = data['callback'];
            task_info.task = data['task'];
            document.title = "Task " + data['task']['id'];
            task_info.task['use_scripted'] = false;
            task_info.responses = data['responses'];
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }

}
function comment_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "error"){
            alertTop("danger", data['error']);
        }
        else{
            task_info.task.comment = data['task']['comment'];
            task_info.task.comment_operator = data['task']['comment_operator'];
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/{{tid}}", set_info, "GET", null);
