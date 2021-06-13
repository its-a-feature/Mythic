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
document.title = "Tasks by Tag";
var tag_info = new Vue({
    el: '#addTagModalData',
    data: {
        tags: [],
        selected_tag: "Select One...",
        current_tags: ""
    },
    delimiters: ['[[',']]']
})
var task_info = new Vue({
    el: '#feed',
    delimiters: ['[[', ']]'],
    data: {
        tasks: [],
        tags: [],
        credentials: [],
        artifacts: [],
        files: [],
        attack: [],
        selected_tag: "Select One...",
    },
    methods: {
        reset_values(){
          this.tasks = [];
          this.credentials = [];
          this.artifacts = [];
          this.files = [];
          this.attack = [];
        },
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
                             try{
                                task['use_scripted'] = true;
                                task['scripted'] = browser_scripts[task['command_id']](task, Object.values(task['response']));
                            }catch(error){
                                task["use_scripted"] = false;
                                task["scripted"] = "";
                                console.log(error.toString());
                                alertTop("warning", task["command"] + " hit a browserscript exception");
                            }
                        }
                        task_info.$forceUpdate();
                     }catch(error){
                         console.log(error.toString());
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
        view_stdout_stderr: function(task){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/stdoutstderr/" + task.id, (response) => {
                try{
                    let data = JSON.parse(response);
                    if(data["status"] === "success"){
                        let text_msg = "stdout:\n" + data["stdout"] + "\n\nstderr:\n" + data["stderr"];
                        $('#addCommentTextArea').val(text_msg);
                        $('#commentModalTitle').text("Stdout/Stderr");
                        $('#addCommentModal').modal('show');
                        $('#addCommentModal').on('shown.bs.modal', function () {
                            $('#addCommentTextArea').focus();
                        });
                        $('#addCommentSubmit').unbind('click').click(function () {});
                    }else{
                        alertTop("error", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                }

            }, "GET", null);
        },
        view_all_parameters: function(task){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/all_params/" + task.id, (response) => {
                try{
                    let data = JSON.parse(response);
                    if(data["status"] === "success"){
                        let text_msg = "Display Parameters:\n" + data["display_params"] + "\n\nOriginal Parameters:\n" + data["original_params"];
                        text_msg += "\n\nFinal Params:\n" + data["params"];
                        $('#addCommentTextArea').val(text_msg);
                        $('#commentModalTitle').text("All Parameters");
                        $('#addCommentModal').modal('show');
                        $('#addCommentModal').on('shown.bs.modal', function () {
                            $('#addCommentTextArea').focus();
                        });
                        $('#addCommentSubmit').unbind('click').click(function () {});
                    }else{
                        alertTop("error", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                }

            }, "GET", null);
        },
        add_tag: function(){
            tag_info.current_tags += "\n" + tag_info.selected_tag;
        },
        view_all_tags: function(task){
            tag_info.selected_tag = "Select One...";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/", (response) => {
                try{
                    let data = JSON.parse(response);
                    if( data["status"] === "success"){
                       tag_info.tags = data["tags"].sort();
                       tag_info.tags.unshift("Select One...");
                    }else{
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                    alertTop("danger", "Failed to make web request: " + error.toString());
                }
            }, "GET",null);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/" + task.id, (response) => {
                try{
                    let data = JSON.parse(response);
                    if( data["status"] === "success"){
                        tag_info.current_tags = data["tags"].join("\n");
                        $('#addTagModal').modal('show');
                        $('#addTagModal').on('shown.bs.modal', function () {
                            $('#addTagTextArea').focus();
                            $("#addTagTextArea").unbind('keyup').on('keyup', function (e) {
                                if (e.keyCode === 13 && !e.shiftKey) {
                                    $('#addTagSubmit').click();
                                }
                            });
                        });
                    }else{
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                    alertTop("danger", "Failed to make web request: " + error.toString());
                }
            }, "GET",null);
            $('#addTagSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/" + task.id, (response) => {
                    try{
                        let data = JSON.parse(response);
                        if( data["status"] === "success"){
                            alertTop("success","Successfully updated tags");
                        }else{
                            alertTop("warning", data["error"]);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Failed to make web request: " + error.toString());
                    }
                }, "PUT", {"tags": tag_info.current_tags.split("\n")});
            });
        },
        view_opsec_block: function(task){
            let text_msg = "";
            if (task.opsec_pre_blocked !== null){
                text_msg += "OPSEC PreCheck Message";
                if (task.opsec_pre_bypassed){
                    text_msg += " ( bypassed by " + task.opsec_pre_bypass_user + " )";
                }
                text_msg += ":\n\n" + task.opsec_pre_message + "\n";
            }
            if (task.opsec_post_blocked !== null){
                text_msg += "OPSEC PostCheck Message";
                if (task.opsec_post_bypassed){
                    text_msg += " ( bypassed by " + task.opsec_post_bypass_user + " )";
                }
                text_msg += ":\n\n" + task.opsec_post_message + "\n";
            }

            $('#addCommentTextArea').val(text_msg);
            $('#commentModalTitle').text("OPSEC Messages");
            $('#addCommentModal').modal('show');
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
            });
            $('#addCommentSubmit').unbind('click').click(function () {});
        },
        submit_opsec_bypass_request: function(task){
          httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + task.id + "/request_bypass/" , (response) => {

            }, "GET", null);
        },
        reissue_request: function(task){
          httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/reissue_task_webhook" , (response) => {
                try{
                    let data = JSON.parse(response);
                    if(data["status"] === "error"){
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error.toString());
                }
            }, "POST", {"input": {"task_id": task.id}});
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
        selected_tag_changed: function () {
            if(task_info.selected_tag === "Select One..."){
                task_info.reset_values();
                return;
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/by_tag", (response) => {
                try{
                    let data = JSON.parse(response);
                    if( data["status"] === "success"){
                       let final_task_data = [];
                        let recent_callback = -1;
                        for(let i = 0; i < data["tasks"].length; i++) {
                            if (data["tasks"][i]["callback"]["id"] !== recent_callback) {
                                // we need to push some callback info
                                final_task_data.push({
                                    "type": "callback_info",
                                    "user": data["tasks"][i]["callback"]["user"],
                                    "host": data["tasks"][i]["callback"]["host"],
                                    "domain": data["tasks"][i]["callback"]["domain"],
                                    "integrity_level": data["tasks"][i]["callback"]["integrity_level"],
                                    "id": data["tasks"][i]["callback"]["id"]
                                });

                                recent_callback = data["tasks"][i]["callback"]["id"];
                            }
                            data["tasks"][i]["type"] = "task";
                            final_task_data.push(data["tasks"][i]);
                        }
                        task_info.tasks = final_task_data;
                       task_info.credentials = data["credentials"];
                       task_info.artifacts = data["artifacts"];
                       task_info.files = data["files"];
                       task_info.attack = data["attack"];
                    }else{
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                    alertTop("danger", "Failed to make web request: " + error.toString());
                }
            }, "POST",{"tag": this.selected_tag});
        },
        get_shareable_link: function(){
            let task_ids = [];
            for(let i = 0; i < this.tasks.length; i++){
                if(this.tasks[i]["type"] === "task"){
                    task_ids.push(this.tasks[i]["id"]);
                }
            }
            let collapsed_range = collapse_range(task_ids);
            copyStringToClipboard(window.location.origin + "/tasks/by_range?tasks=" + collapsed_range);
            alertTop("success", "Copied link to clipboard");
        },
        delete_tag: function(){
            $('#tagDeleteModal').modal('show');
            $('#tagDeleteSubmit').unbind('click').click(function () {
                let task_ids = [];
                for(let i = 0; i < task_info.tasks.length; i++){
                    if(task_info.tasks[i]["type"] === "task"){
                        task_ids.push(task_info.tasks[i]["id"]);
                    }
                }
                alertTop("info", "Deleting tag...", 2);
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tags/delete", (response) => {
                    try{
                        let data = JSON.parse(response);
                        if(data["status"] === "success"){
                            alertTop("success", "Successfully deleted", 2);
                            let tag_index = task_info.tags.indexOf(task_info.selected_tag);
                            if(tag_index !== -1){
                                task_info.tags.splice(tag_index, 1);
                            }
                            task_info.selected_tag = "Select One...";
                            task_info.reset_values();
                        }else{
                            alertTop("warning", data["error"]);
                        }
                    }catch(error){
                        console.log(error.toString());
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", {"tag": task_info.selected_tag, "tasks": task_ids });
            });
        }
    }
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/", (response) => {
    try{
        let data = JSON.parse(response);
        if( data["status"] === "success"){
           task_info.tags = data["tags"].sort();
           task_info.tags.unshift("Select One...");
        }else{
            alertTop("warning", data["error"]);
        }
    }catch(error){
        console.log(error);
        alertTop("danger", "Failed to make web request: " + error.toString());
    }
}, "GET",null);
function collapse_range(all_nums){
    // takes in an array of the expanded numbers and collapses it down
    all_nums.sort();
    // pulled from https://stackoverflow.com/a/2270987
    let ranges = [], rstart, rend;
    for (let i = 0; i < all_nums.length; i++) {
      rstart = all_nums[i];
      rend = rstart;
      while (all_nums[i + 1] - all_nums[i] === 1) {
        rend = all_nums[i + 1]; // increment the index if the numbers sequential
        i++;
      }
      ranges.push(rstart === rend ? rstart+'' : rstart + '-' + rend);
    }
    return ranges.join(",");
}