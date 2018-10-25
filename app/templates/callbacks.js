var callbacks = {}; //all callback data
var tasks = []; //current tasks we're displaying
var all_tasks = {}; //dictionary of arrays of tasks (for each callback's tasks)
var meta = {}; //dictionary of dictionary of metadata
var username = "{{name}}"; //gets the logged in name from the base.html
var finished_callbacks = false;
var finished_tasks = false;
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks
    },
    methods: {
        interact_button: function(callback){
            //url = "http://localhost/api/v1.0/tasks/callback/" + callback['id'];
            //httpGetAsync(url, display_callback_tasks);
            if ( callback.id in all_tasks ){
                //task_data.tasks = all_tasks[callback.id];
                meta[callback.id].data = all_tasks[callback.id];
            }
            else{
                //Vue.set(task_data, tasks, [])
                //Vue.set(all_tasks, callback.id, []);
                meta[callback.id].data = all_tasks[callback.id];
                //task_data.tasks = [];
            }
            task_data.input_field_placeholder['data'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
            task_data.input_field_placeholder['cid'] = callback.id;
            meta[callback.id]['tasks'] = true;
            meta[callback.id]['display'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
        },
        spawn_menu: function(callback){
            //display a modal menu for the user to get some information about spawning a new callback
            possiblePayloads = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/current_operation"));
            var payloads = '<option value="-1">current callback as template for new payload</option>';
            for(var i = 0; i < possiblePayloads.length; i++){
                if(possiblePayloads[i].tag !== ""){
                    //if there's already a default tag, just use it to ID the payload
                    payloads = payloads + '<option value="' + possiblePayloads[i].uuid + '">'
                    + possiblePayloads[i].tag + '</option>';
                }
                else{
                    //if there is no tag associated, ID it with uuid for now
                    payloads = payloads + '<option value="' + possiblePayloads[i].uuid + '">'
                    + possiblePayloads[i].uuid + '</option>';
                }
            }
            $( '#spawnPayload' ).html(payloads);
            var defaultNewTag = username + " on " + callback.id + " using " + $('#spawnMethod').val();
            $( '#spawnTag').val(defaultNewTag);
            $( '#spawnModal' ).modal('show');
            // because we do this 'binding' with .click in this function, it happens every time we make the modal show
            //   if we don't unbind each time, then we'll bind multiple times and call the function repeatedly for each click
            $( '#spawnSubmit' ).unbind('click').click(function(){
                //Now we have everything we need to submit this post request!
                post_data = {'pcallback': callback.id, 'task': true, 'operator': username, 'command': $('#spawnMethod').val().split(" ")[0], 'params': $('#spawnMethod').val().split(" ").slice(1, ).join(' ')}
                if( $('#spawnPayload').val() == -1){
                    //we selected to use our current payload
                    post_data['payload'] = callback.registered_payload;
                }
                else{
                    //we selected an already existing payload that was registered, so use that uuid
                    post_data['payload'] = $('#spawnPayload').val();
                }
                if( $('#spawnNewTag').val() == "on"){
                    post_data['tag'] = $('#spawnTag').val();
                }
                else{
                    if($('#spawnPayload').val() == -1){
                        //we didn't specify a new tag and we want to use a new payload, so create a meaningful new tag
                        post_data['tag'] = username + " on " + callback.id + " using " + $('#spawnMethod').val();
                    }
                }
                //should have all the data we need, submit the POST request
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create",
                null, "POST", post_data);
            });

        },
        hide_tasks: function(callback){
            meta[callback.id]['tasks'] = false;
        },
        exit_callback: function(callback){
            //task the callback to exit on the host
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + callback['id'],
            null, "POST", {"command":"exit","params":""});
        },
        remove_callback: function(callback){
            //remove callback from our current view until we potentially get a checkin from it
            meta[callback.id]['tasks'] = false;
            this.$delete(meta, callback.id);
            this.$delete(callbacks, callback.id);
            //update the callback to be active=false
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],null,"PUT", {"active":"false"});
        }
    },
    delimiters: ['[[',']]']
});
var task_data = new Vue({
    el: '#bottom-data',
    data: {
        tasks,
        input_field: "",
        input_field_placeholder: {"data":"","cid":-1},
        meta: meta,
        all_tasks
    },
    methods:{
        task_button: function(data){
            //submit the input_field data as a task, need to know the current callback id though
            //httpGetAsync(theUrl, callback, method, data)
            task = this.input_field.trim().split(" ");
            command = task[0];
            params = "";
            if (task.length > 1){
                params = task.slice(1, ).join(' '); //join index 1 to the end back into a string of params
            }
            if (command == "shell_elevated"){
                shell_elevate_cmd = prompt("Please enter the command to execute", "cat /etc/sudoers");
                if (shell_elevate_cmd != null){
                    shell_elevate_prompt = prompt("Please enter prompt to ask for credentials", "");
                    if (shell_elevate_prompt != null){
                        params = JSON.stringify({"command":shell_elevate_cmd, "prompt":shell_elevate_prompt});
                    }
                }
            }
            else if(command == "shell_api"){
                shell_api_path = prompt("Please enter the path of the binary to execute", "/bin/ps");
                if (shell_api_path != null){
                    shell_api_args_string = prompt("Please enter the args for this binary", "-ax");
                    if(shell_api_args_string != null){
                        shell_api_args = shell_api_args_string.split(" ");
                        params = JSON.stringify({"path":shell_api_path, "args":shell_api_args});
                    }
                }
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],
            post_task_callback_func, "POST", {"command":command,"params":params});
            //alert("submitting " + this.input_field);
            this.input_field = "";
        },
        select_tab: function(tab_data, tab_id){
            task_data.input_field_placeholder['data'] = tab_data;
            task_data.input_field_placeholder['cid'] = tab_id;
        }
    },
    delimiters: ['[[', ']]']
});
function post_task_callback_func(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alert(data['error']);
        task_data.input_field = data['cmd'] + " " + data['params'];
    }
}
function startwebsocket_callbacks(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){

            cb = JSON.parse(event.data);
            //console.log(cb);
            if(cb['active'] == false){
                return; //don't process this if the callback is no longer active
            }
            if (cb.hasOwnProperty('operator')){
                if (cb['operator'] == "null"){
                    delete cb.operator;
                }
                else{
                    op = cb['operator'].slice(0);
                    delete cb.operator;
                    cb['operator'] = op;
                }
            }
            cb['real_time'] = "0:0:0:0";
            //callbacks.push(cb);
            Vue.set(callbacks, cb['id'], cb);
            Vue.set(task_data.meta, cb['id'], {'id': cb['id'],
                                               'tasks': false,
                                               'data':task_data.tasks,
                                               'display': ''});
        }
        else{
            if(finished_callbacks == false){
                startwebsocket_newtasks();
                finished_callbacks = true;
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
    }
    ws.onerror = function(){
        //console.log("websocket error");
    }
    ws.onopen = function(event){
        //console.debug("opened");
    }
};
function startwebsocket_newtasks(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/tasks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            tsk = JSON.parse(event.data);
            //console.log("new task");
            //console.log(tsk);
            if (callbacks[tsk['callback']]){
                if (callbacks[tsk['callback']]['active'] == false){
                    return;
                }
            }
            if ( !(tsk['callback'] in all_tasks) ){
                // if there is NOT this specific callback.id in the tasks dictionary
                // then create it as an empty dictionary
                Vue.set(all_tasks, tsk['callback'], {}); //create an empty dictionary
            }
            Vue.set(all_tasks[tsk['callback']], tsk['id'], tsk);
            // in case this is the first task and we're waiting for it to show up, reset this
            if(!meta[tsk['callback']]){
                meta[tsk['callback']] = {};
            }
            meta[tsk['callback']].data = all_tasks[tsk['callback']];
        }
        else{
            if(finished_tasks == false){
                startwebsocket_updatedtasks();
                finished_tasks = true;
            }
        }
    };
};
function startwebsocket_updatedtasks(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/responses/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            rsp = JSON.parse(event.data);
            //console.log(rsp);
            if(rsp['task']['callback'] in all_tasks){
                //if we have that callback id in our all_tasks list
                if(!all_tasks[rsp['task']['callback']][rsp['task']['id']]['response']){
                    //but we haven't received any responses for the specified task_id
                    Vue.set(all_tasks[ rsp['task']['callback']] [rsp['task']['id']], 'response', {});
                }
                //console.log(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']]);
                var updated_response = rsp['response'].replace(/\\n|\r[^\n]/g, '\n');
                // all_tasks->callback->task->response->id = timestamp, responsevalue
                Vue.set(all_tasks[rsp['task']['callback']] [rsp['task']['id']] ['response'], rsp['id'], {'timestamp': rsp['timestamp'], 'response': updated_response});
            }
        }
    };
};
function startwebsocket_updatedcallbacks(){
var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedcallbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            rsp = JSON.parse(event.data);
            if(callbacks[rsp['id']]){
                callbacks[rsp['id']]['last_checkin'] = rsp['last_checkin'];
            }
	    // we ned to handle the case where something was not active, so we didn't populate it in the global tables, but it called back in and got updated
	    //TODO
        }
    }
};
function updateClocks(){
    now = new Date();
    for(var key in callbacks){
        // update each 'last_checkin' time to be now - that value
        checkin_time = new Date(callbacks[key]['last_checkin']);
        callbacks[key]['real_time'] = timeConversion(now - checkin_time);
    }
}
function timeConversion(millisec){
    var seconds = Math.trunc(((millisec / 1000).toFixed(1)) % 60);
    var minutes = Math.trunc(((millisec / (1000 * 60)).toFixed(1)) % 60);
    var hours = Math.trunc(((millisec / (1000 * 60 * 60)).toFixed(1)) % 24);
    var days = Math.trunc(((millisec / (1000 * 60 * 60 * 24)).toFixed(1)) % 365);
    return days + ":" + hours + ":" + minutes + ":" + seconds;
}


startwebsocket_callbacks();
setInterval(updateClocks, 1000);

startwebsocket_updatedcallbacks();
