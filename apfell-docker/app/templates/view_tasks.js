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
//[{callback info, "tasks": [{task info, "responses": [{response info}]}]},
// {callback2, "tasks": [{task_info, "responses": [{response info}]}]}
//]
var tasks_div = new Vue({
    el: '#tasks_div',
    data: {
        callbacks: [],
        page_size: 15,
        current_page: 1,
        total_count: 0
    },
    methods: {
        toggle_response: function(task, index){
            if(task.hasOwnProperty('responses')){
                this.$delete(task,'responses');
                $('#color-arrow' + task['id']).css("transform", "rotate(0deg)");
            }
            else{
                var responses = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/by_task/" + task['id']));
                if(responses.hasOwnProperty("status")){
                    alertTop("danger", responses['error']);
                }
                else{
                    $('#color-arrow' + task['id']).css("transform", "rotate(180deg)");
                    task['use_scripted'] = false;
                    if(browser_scripts.hasOwnProperty(task['command_id'])){
                        task['use_scripted'] = true;
                        task['scripted'] = browser_scripts[task['command_id']](task, responses);
                    }
                    Vue.set(task, 'responses', responses);
                }
            }
        },
        copyStringToClipboard: function (str) {
          // Create new element
          var el = document.createElement('textarea');
          // Set value (string to be copied)
          el.value = str;
          // Set non-editable to avoid focus and move outside of view
          el.setAttribute('readonly', '');
          el.style = {position: 'absolute', left: '-9999px'};
          document.body.appendChild(el);
          // Select text inside element
          el.select();
          // Copy text to clipboard
          document.execCommand('copy');
          // Remove temporary element
          document.body.removeChild(el);
        },
        update_view: function(task){
            Vue.set(task, 'use_scripted', !task['use_scripted']);
            this.$forceUpdate();
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
            alertTop("info", "Loading...", 1);
        },
        get_page: function(page){
            filter_query = $('#filter').val();
            if(filter_query == ""){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + page + "/" + this.page_size, set_callback_data_callback, "GET", null);
            }else{
                data = {"search": filter_query, "page": page, "size": this.page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/search", set_callback_data_callback, "POST", data);
            }

        },
        get_new_page_size: function(){
            page_size = $('#page_size').val();
            filter_query = $('#filter').val();
            if(filter_query != ""){
                data = {"search": filter_query, "page": 1, "size": page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/search", set_callback_data_callback, "POST", data);
            }else{
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + 1 + "/" + page_size, set_callback_data_callback, "GET", null);
            }

            this.page_size = page_size;
        },
        filter: function(){
            filter_query = $('#filter').val();
            data = {"search": filter_query, "size": this.page_size, "page": 1};
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/search", set_callback_data_callback, "POST", data);
            this.current_page = 1;
        }
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/1/15", set_callback_data_callback, "GET", null);
function set_callback_data_callback(response){
    try{
        data = JSON.parse(response);
        //console.log(data);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error'], 2);
    }else{
        tasks_div.callbacks = [];
         for(t in data['callbacks']){
            data['callbacks']['tasks'] = [];
            tasks_div.callbacks.push(data['callbacks'][t]);
         }
         tasks_div.total_count = data['total_count'];
         tasks_div.current_page = data['page'];
         tasks_div.page_size = data['size'];
    }
}
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
                    alertTop("success", "Loaded", 1);
                    return;
                }
            }
        }
        alertTop("success", "No tasks", 1);
    }else{
        alertTop("danger", "There was an error loading the tasks", 2);
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