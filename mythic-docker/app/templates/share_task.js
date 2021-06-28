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
document.title = "Shared Task";
var tag_info = new Vue({
    el: '#addTagModalData',
    data: {
        tags: [],
        selected_tag: "Select One...",
        current_tags: ""
    },
    delimiters: ['[[',']]']
})
var add_tasks = new Vue({
    el: "#addTasksModal",
    data: {
        before: 10,
        after: 10,
        search: "all",
        operator: "",
        task_options: [],
        task_id: 0
    },
    methods: {
      reset_values: function(){
          this.before = 10;
          this.after = 10;
          this.search = "all";
          this.operator = "";
          this.task_id = 0;
          this.task_options = [];
      }
    },
    delimiters: ['[[',']]']
})
var task_info = new Vue({
    el: '#task_info',
    data: {
        tasks: [],
        artifacts: [],
        files: [],
        credentials: [],
        attack: [],
        title: "",
        remove_tasks: false
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
        update_view: function(){
            this.$forceUpdate();
        },
        add_more_tasks: function(callback, index){
            add_tasks.reset_values();
            for(let i = index + 1; i < task_info.tasks.length; i++){
                if(task_info.tasks[i]["type"] === "callback_info"){
                    break;
                }else{
                   add_tasks.task_options.push(task_info.tasks[i]["id"]);
                }
            }
            add_tasks.task_id = add_tasks.task_options[0];
             $('#addTasksModal').modal('show');
             $('#addTasksSubmit').unbind('click').click(function () {
                 let data = {
                     "after": add_tasks.after,
                     "before": add_tasks.before,
                     "tasks": [add_tasks.task_id.toString()]
                 };
                 if(add_tasks.search === "operator"){
                     data["search"] = add_tasks.operator;
                 }else{
                     data["search"] = add_tasks.search;
                 }
                 alertTop("info", "Fetching new tasks...", 2);
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/by_range", (response) => {
                    try{
                        clearTop();
                        let data = JSON.parse(response);
                        if( data["status"] === "success"){
                            alertTop("success", "Successfully fetched new data", 2);
                            merge_search_info(data);
                        }else{
                            alertTop("warning", data["error"]);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Failed to make web request: " + error.toString());
                    }
                }, "POST", data);
            });
        },
        mark_for_removal: function(){
            this.remove_tasks = true;
        },
        remove_selected_tasks: function(){
            let tasks_to_stay = []
            for(let i = 0; i < task_info.tasks.length; i++){
                if(task_info.tasks[i]["type"] === "task"){
                    if(task_info.tasks[i]["to_delete"] !== true){
                        tasks_to_stay.push(task_info.tasks[i]["id"]);
                    }
                }
            }

            let range = collapse_range(tasks_to_stay);
            if(range === ""){
                alertTop("warning", "Can't remove all tasks from view");
                return;
            }
            alertTop("info", "Getting new search data...", 2);
            let data = {"tasks": range.split(",")}
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/by_range", set_search_info, "POST", data);
        },
        add_tag_to_all: function(){
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
            tag_info.current_tags = "";
            $('#addTagModal').modal('show');
            $('#addTagModal').on('shown.bs.modal', function () {
                $('#addTagTextArea').focus();
                $("#addTagTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $('#addTagSubmit').click();
                    }
                });
            });
            $('#addTagSubmit').unbind('click').click(function () {
                let tasks = [];
                for(let i = 0; i < task_info.tasks.length; i++){
                    if(task_info.tasks[i]["type"] === "task"){
                        tasks.push(task_info.tasks[i]["id"]);
                    }
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/add_tags/" , (response) => {
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
                }, "PUT", {"tags": tag_info.current_tags.split("\n"), "tasks": tasks});
            });
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
            let final_task_data = [];
            final_task_data.push({
                        "type": "callback_info",
                        "user": data["callback"]["user"],
                        "host": data["callback"]["host"],
                        "domain": data["callback"]["domain"],
                        "integrity_level": data["callback"]["integrity_level"],
                        "id": data["callback"]["id"]
                    });
            data["task"]["type"] = "task";
            final_task_data.push(data["task"]);
            for(let i = 0; i < data["subtasks"].length; i++){
                data["subtasks"][i]["type"] = "task";
                final_task_data.push(data["subtasks"][i]);
            }
            task_info.tasks = final_task_data;
            task_info.artifacts = data["artifacts"];
            task_info.files = data["files"];
            task_info.credentials = data["credentials"];
            task_info.attack = data["attack"];
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
function merge_search_info(data){
    task_info.title = "Task Search Results";
    merge_tasks(data);
    // now merge the rest of the data
    task_info.artifacts = merge_arrays_by_ids(task_info.artifacts.slice(0), data["artifacts"], "id");
    task_info.files = merge_arrays_by_ids(task_info.files.slice(0), data["files"], "id");
    task_info.credentials = merge_arrays_by_ids(task_info.credentials.slice(0), data["credentials"], "id");
    task_info.attack = merge_arrays_by_ids(task_info.attack.slice(0), data["attack"], "attack");
}
function merge_arrays_by_ids(oldArray, newArray, attr){
    for(let i = 0; i < newArray.length; i++){
        let existsInOld = false;
        for(let j = 0; j < oldArray.length; j++){
            if(oldArray[j][attr] === newArray[i][attr]){
                existsInOld = true;
                break;
            }
        }
        if(!existsInOld){
            oldArray.push(newArray[i]);
        }
    }
    oldArray.sort((a, b) => (a[attr] > b[attr]) ? 1 : -1)
    return oldArray;
}
function merge_tasks(data){
    let old_tasks = [];
    for(let i = 0; i < task_info.tasks.length; i++){
        if(task_info.tasks[i]["type"] === "task"){
            old_tasks.push(task_info.tasks[i]);
        }
    }
    let merged_tasks = merge_arrays_by_ids(old_tasks.slice(0), data["tasks"], "id")
    let final_task_data = [];
    let task_ids = [];
    let recent_callback = -1;
    for(let i = 0; i < merged_tasks.length; i++) {
        if (merged_tasks[i]["callback"]["id"] !== recent_callback) {
            // we need to push some callback info
            final_task_data.push({
                "type": "callback_info",
                "user": merged_tasks[i]["callback"]["user"],
                "host": merged_tasks[i]["callback"]["host"],
                "domain": merged_tasks[i]["callback"]["domain"],
                "integrity_level": merged_tasks[i]["callback"]["integrity_level"],
                "id": merged_tasks[i]["callback"]["id"]
            });

            recent_callback = merged_tasks[i]["callback"]["id"];
        }
        task_ids.push(merged_tasks[i]["id"]);
        merged_tasks[i]["type"] = "task";
        final_task_data.push(merged_tasks[i]);
    }
    task_info.tasks = final_task_data;
    let range = collapse_range(task_ids);
    window.history.replaceState(null, "Shared Tasks", "/tasks/by_range?tasks=" + range);
}
function set_search_info(response){
    try{
        task_info.remove_tasks = false;
        let data = JSON.parse(response);
        task_info.title = "Task Search Results";
        clearTop()
        if(data['status'] === "error"){
            alertTop("danger", data['error']);
        }
        else{
            let final_task_data = [];
            let task_ids = [];
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
                task_ids.push(data["tasks"][i]["id"]);
                data["tasks"][i]["type"] = "task";
                final_task_data.push(data["tasks"][i]);
            }
            task_info.tasks = final_task_data;
            task_info.artifacts = data["artifacts"];
            task_info.files = data["files"];
            task_info.credentials = data["credentials"];
            task_info.attack = data["attack"];
            let range = collapse_range(task_ids);
            window.history.replaceState(null, "Shared Tasks", "/tasks/by_range?tasks=" + range);
            alertTop("success", "Successfully fetched new data", 2);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
function collapse_range(all_nums){
    // takes in an array of the expanded numbers and collapses it down
    all_nums.sort( (a,b) => a - b);
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
function comment_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "error"){
            alertTop("danger", data['error']);
        }
        else{
            for(let i = 0; i < task_info.tasks.length; i++){
                if(task_info.tasks[i]["id"] === data["task"]["id"]){
                    task_info.tasks[i]["comment"] = data["task"]["comment"];
                    task_info.tasks[i]["comment_operator"] = data["task"]["comment_operator"];
                    return;
                }
            }
        }
    }catch(error){
        console.log(error.toString());
        alertTop("danger", "Session expired, please refresh");
    }
}
function fetch_data(){
    try{
        let params = new URLSearchParams(window.location.search);
        if(params.has("tasks")){
            let data = {"tasks": params.get("tasks").split(",")};
            if(params.has("before")){
                data["before"] = params.get("before");
            }
            if(params.has("after")){
                data["after"] = params.get("after");
            }
            if(params.has("search")){
                data["search"] = params.get("search");
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/by_range", set_search_info, "POST", data);
        }else{
            task_info.title = "Task {{tid}} and subtasks";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/{{tid}}", set_info, "GET", null);
        }
    }catch(error){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/{{tid}}", set_info, "GET", null);
    }
}
fetch_data();

