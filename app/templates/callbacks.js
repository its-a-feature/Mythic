var callbacks = {}; //all callback data
var tasks = []; //current tasks we're displaying
var all_tasks = {}; //dictionary of arrays of tasks (for each callback's tasks)
var meta = {}; //dictionary of dictionary of metadata
var username = "{{name}}"; //gets the logged in name from the base.html
var finished_callbacks = false;
var finished_tasks = false;
var ptype_cmd_params = {}; //where we keep track of payload type -> command -> command_parameter mappings for what has called in
var ws_newtasks;
var ws_updatedtasks;
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks
    },
    methods: {
        interact_button: function(callback){
            //get the data from teh background process (all_tasks) into the bottom tab that's being loaded (task_data.meta)
            Vue.set(task_data.meta[callback.id], 'data', all_tasks[callback.id] );
            Object.keys(task_data.meta).forEach(function(key){
                Vue.set(task_data.meta[key], 'selected', false);
            });
            Object.keys(this.callbacks).forEach(function(key){
                Vue.set(this.callbacks[key], 'selected', false);
            });
            Vue.set(task_data.meta[callback.id], 'selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);

            task_data.input_field_placeholder['data'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
            task_data.input_field_placeholder['cid'] = callback.id;
            Vue.set(task_data.meta[callback.id], 'tasks', true);
            task_data.meta[callback.id]['display'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
            $('#tasks' + callback.id.toString() + 'tab').click();
            ws_newtasks.send("a" + callback.id);
            ws_updatedtasks.send("a" + callback.id);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'] + "/all_tasking",get_all_tasking_callback,"GET",null);
        },
        edit_description: function(callback){
            $( '#editDescriptionText' ).val(callback.description);
            $( '#editDescriptionModal' ).modal('show');
            $( '#editDescriptionSubmit' ).unbind('click').click(function(){
                var newDescription = $( '#editDescriptionText' ).val();
                if(newDescription != callback.description){
                    //only bother sending the update request if the description is actually different
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],edit_description_callback,"PUT", {"description": newDescription});
                }
            });
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
            meta[callback.id]['screencaptures'] = false;
            meta[callback.id]['keylogs'] = false;
            stop_getting_callback_updates(callback.id);
        },
        exit_callback: function(callback){
            //task the callback to exit on the host
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + callback['id'],
            null, "POST", {"command":"exit","params":""});
        },
        remove_callback: function(callback){
            //remove callback from our current view until we potentially get a checkin from it
            //meta[callback.id]['tasks'] = false;
            //meta[callback.id]['screencaptures'] = false;
            //this.$delete(meta, callback.id);
            //this.$delete(callbacks, callback.id);
            //update the callback to be active=false
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],null,"PUT", {"active":"false"});
            stop_getting_callback_updates(callback.id);
        },
        show_screencaptures: function(callback){
            Vue.set(meta[callback.id], 'screencaptures', true);
            meta[callback.id]['display'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/bycallback/" + callback['id'],view_callback_screenshots,"GET");
        },
        show_keylogs: function(callback){
            Vue.set(meta[callback.id], 'keylogs', true);
            meta[callback.id]['display'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/callback/" + callback['id'],view_callback_keylogs,"GET");
        }
    },
    delimiters: ['[[',']]']
});
function get_all_tasking_callback(response){
    var data = JSON.parse(response);
    if(data['status'] == 'success'){
        //this has [callback_info, "tasks": [ {task_info, "responses": [ {response_info} ] } ] ]
        for(var i = 0; i < data['tasks'].length; i++){
            add_new_task(data['tasks'][i]);
            for(var j = 0; j < data['tasks'][i]['responses'].length; j++){
                add_new_response(data['tasks'][i]['responses'][j]);
            }
        }
    }
}
function stop_getting_callback_updates(id){
    //make sure we stop getting updates from the websockets
    ws_newtasks.send("r" + id);
    ws_updatedtasks.send("r" + id);
    // clear out the data from memory
    Vue.set(task_data.meta[id], 'data', []);
    Vue.set(all_tasks, id, {});
}
function edit_description_callback(response){
    var data = JSON.parse(response);
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }
    // if we were successful, the update callback websocket will get the data and update the UI

}
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
            if(ptype_cmd_params.hasOwnProperty(callbacks[data['cid']]['payload_type'])){
                for(var i = 0; i < ptype_cmd_params[callbacks[data['cid']]['payload_type']].length; i++){
                    if(command == "help"){
                        if(ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] == params){
                            alertBottom("info", ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['help_cmd']);
                            //alert(ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['help_cmd']);
                            return;
                        }
                    }
                    else if(ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] == command){
                        if(params.length == 0 && ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length != 0){
                            //if somebody specified command arguments on the commandline without going through the GUI, by all means, let them
                            //  This is for if they want the GUI to auto populate for them
                            //  Also make sure that there are actually parameters for them to fill out
                            params_table.command_params = [];
                            for(var j = 0; j < ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length; j++){
                                var blank_vals = {"string_value": "", "credential_value":"", "credential_id": 0, "number_value": -1, "choice_value": "", "choicemultiple_value": [], "boolean_value": false, "array_value": []}
                                var param = Object.assign({}, blank_vals, ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'][j]);
                                params_table.command_params.push(param);
                            }
                            $( '#paramsModalHeader' ).text(command + "'s Parameters");
                            var credentials = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials/current_operation"));
                            if(credentials['status'] == 'success'){
                                params_table.credentials = credentials['credentials'];
                            }
                            else{
                                alertTop("danger", credentials['error']);
                                console.log(credentials);
                                return;
                            }
                            $( '#paramsModal' ).modal('show');
                            $( '#paramsSubmit' ).unbind('click').click(function(){
                                param_data = {};
                                file_data = {};  //mapping of param_name to uploaded file data
                                for(var k = 0; k < params_table.command_params.length; k++){
                                    if(params_table.command_params[k]['type'] == "String"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['string_value']; }
                                    else if(params_table.command_params[k]['type'] == "Credential"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['credential_value']; }
                                    else if(params_table.command_params[k]['type'] == "Number"){  param_data[params_table.command_params[k]['name']] = parseInt(params_table.command_params[k]['number_value']); }
                                    else if(params_table.command_params[k]['type'] == "Choice"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choice_value']; }
                                    else if(params_table.command_params[k]['type'] == "ChoiceMultiple"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choicemultiple_value']; }
                                    else if(params_table.command_params[k]['type'] == "Boolean"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['boolean_value']; }
                                    else if(params_table.command_params[k]['type'] == "Array"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['array_value']; }
                                    else if(params_table.command_params[k]['type'] == "File"){
                                        var param_name = params_table.command_params[k]['name'];
                                        file_data[param_name] = document.getElementById('fileparam' + param_name).files[0];
                                        param_data[param_name] = "FILEUPLOAD";
                                    }
                                }
                                uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func,file_data, {"command":command,"params": JSON.stringify(param_data)});
                                //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                            });
                            this.input_field = "";
                        }
                        else{
                            //somebody knows what they're doing or a command just doesn't have parameters, send it off
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params":params});
                            this.input_field = "";
                        }
                        return;
                    }
                }
                //If we got here, that means we're looking at an unknown command
                alertBottom("warning", "Unknown command: " + command);
            }

        },
        select_tab: function(metadata){
            task_data.input_field_placeholder['data'] = metadata.display;
            task_data.input_field_placeholder['cid'] = metadata.id;
            Object.keys(meta).forEach(function(key){
                Vue.set(meta[key], 'selected', false);
            });
            Object.keys(callback_table.callbacks).forEach(function(key){
                Vue.set(callback_table.callbacks[key], 'selected', false);
            });
            Vue.set(metadata, 'selected', true);
            Vue.set(callback_table.callbacks[metadata['id']], 'selected', true);
        },
        toggle_image: function(image){
            var panel = document.getElementById(image.remote_path).nextElementSibling;
            if (panel.style.display === "") {
                panel.style.display = "none";
            } else {
                panel.style.display = "";
            }
        },
        console_tab_close: function(metadata){
            //var tabContentId = document.getElementById('tasks' + metadata.id + "tab");
            //$(this).parent().parent().hide(); //remove li of tab
            //$('#myTab a:last').tab('show'); // Select first tab
            //$(tabContentId).hide(); //remove respective tab content
            //$(document.getElementById('tasks' + metadata.id + 'data')).hide();
            meta[metadata.id]['tasks'] = false;
            stop_getting_callback_updates(metadata.id);
        },
        screencaptures_tab_close: function(metadata){
            meta[metadata.id]['screencaptures'] = false;
        },
        keylog_tab_close: function(metadata){
            meta[metadata.id]['keylogs'] = false;
        },
        cmd_history_up: function(placeholder_data){
            var cid = this.input_field_placeholder['cid'];
            meta[cid]['history_index'] -= 1;
            if( meta[cid]['history_index'] < 0){
                meta[cid]['history_index'] = 0;
            }
            var index = meta[cid]['history_index'];
            this.input_field = meta[cid]['history'][index];

        },
        cmd_history_down: function(placeholder_data){
            var cid = this.input_field_placeholder['cid'];
            meta[cid]['history_index'] += 1;
            if( meta[cid]['history_index'] >= meta[cid]['history'].length){
                meta[cid]['history_index'] = meta[cid]['history'].length -1;
            }
            var index = meta[cid]['history_index'];
            this.input_field = meta[cid]['history'][index];
        }
    },
    delimiters: ['[[', ']]'],
    updated: function(){
        this.$nextTick(function(){
            //this is called after the DOM is updated via VUE
            $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
        });
    }
});
var command_params = [];
var params_table = new Vue({
    el: '#paramsTable',
    data: {
        command_params,
        credentials: []
    },
    methods:{
        command_params_add_array_element: function(param){
            param.array_value.push('');
        },
        command_params_remove_array_element: function(param, index){
            param.array_value.splice(index, 1);
        },
        select_main_credential: function(param){
            for(var i = 0; i < params_table.credentials.length; i++){
                if(params_table.credentials[i].id == param.credential_id){
                    var options = {"domain":params_table.credentials[i].domain,
                    "username": params_table.credentials[i].user,
                    "credential": params_table.credentials[i].credential.substring(0, 70)}
                    param.credential = options;
                }
            }

        }
    },
    delimiters: ['[[',']]']
});
function view_callback_screenshots(response){
    data = JSON.parse(response);
    if(data['status'] == "success"){
        meta[data['callback']]['images'] = [];
        for(var i = 0; i < data['files'].length; i++){
            var path = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + data['files'][i]['id'];
            data['files'][i]['remote_path'] = path;
            Vue.set(meta[data['callback']]['images'], i, data['files'][i]);
        }
    }
    else{
        alertTop("danger", data['error']);
    }
}
function view_callback_keylogs(response){
    data = JSON.parse(response);
    if(data['status'] == "success"){
        //meta[data['callback']]['keylog_data'] = [];
        Vue.set(meta[data['callback']], 'keylog_data', data['keylogs']);
    }
    else{
        alertTop("danger", data['error']);
    }
}
function post_task_callback_func(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
        task_data.input_field = data['cmd'] + " " + data['params'];
    }
}
function startwebsocket_callbacks(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){

            cb = JSON.parse(event.data);
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
            var color = generate_background_color();
            cb['real_time'] = "0:0:0:0";
            cb['bg_color'] = color;
            cb['selected'] = false;
            Vue.set(callbacks, cb['id'], cb);
            Vue.set(task_data.meta, cb['id'], {'id': cb['id'],
                                               'tasks': false,
                                               'data':task_data.tasks,
                                               'display': '',
                                               'screencaptures': false,
                                               'bg_color': color,
                                               'history': [],
                                               'history_index': 0,
                                               'keylogs': false});
            // check to see if we have this payload type in our list, if not, request the commands for it
            if( !ptype_cmd_params.hasOwnProperty(cb['payload_type'])){
                ptype_cmd_params[cb['payload_type']] = [];
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + cb['payload_type'] + "/commands", register_new_command_info, "GET", null);
            }
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
//we will get back a series of commands and their parameters for a specific payload type, keep track of this in ptype_cmd_params so we can
//  respond to help requests and build dynamic forms for getting command data
function register_new_command_info(response){
    data = JSON.parse(response);
    if(data['status'] == "success"){
        delete data['status'];
        if(data['commands'].length > 0){
            ptype_cmd_params[data['commands'][0]['payload_type']] = data['commands'];
        }
    }
    else{
        alertTop("danger", data['error']);
    }
}
function startwebsocket_newtasks(){
    ws_newtasks = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/tasks/current_operation');
    ws_newtasks.onmessage = function(event){
        if (event.data != ""){
            tsk = JSON.parse(event.data);
            add_new_task(tsk);
        }
        else{
            if(finished_tasks == false){
                startwebsocket_updatedtasks();
                finished_tasks = true;
            }
        }
        ws_newtasks.send("");
    };
};
function add_new_task(tsk){
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
    task_data.meta[tsk['callback']]['history'].push(tsk['command'] + " " + tsk['params']); // set up our cmd history
    task_data.meta[tsk['callback']]['history_index'] = task_data.meta[tsk['callback']]['history'].length;
    // in case this is the first task and we're waiting for it to show up, reset this
    if(!meta[tsk['callback']]){
        meta[tsk['callback']] = {};
    }
    meta[tsk['callback']].data = all_tasks[tsk['callback']];
}
function startwebsocket_updatedtasks(){
    ws_updatedtasks = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/responses/current_operation');
    ws_updatedtasks.onmessage = function(event){
        if (event.data != ""){
            rsp = JSON.parse(event.data);
            //console.log(rsp);
            add_new_response(rsp);
        }
        ws_updatedtasks.send("");
    };
};
function add_new_response(rsp){
    if(rsp['task']['callback'] in all_tasks){
        //if we have that callback id in our all_tasks list
        if(!all_tasks[rsp['task']['callback']][rsp['task']['id']]){
            Vue.set(all_tasks[ rsp['task']['callback'] ], rsp['task']['id'], {});
        }
        if(!all_tasks[rsp['task']['callback']][rsp['task']['id']]['response']){
            //but we haven't received any responses for the specified task_id
            Vue.set(all_tasks[ rsp['task']['callback']] [rsp['task']['id']], 'response', {});
        }
        //console.log(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']]);
        var updated_response = rsp['response'].replace(/\\n|\r/g, '\n');
        // all_tasks->callback->task->response->id = timestamp, responsevalue
        Vue.set(all_tasks[rsp['task']['callback']] [rsp['task']['id']] ['response'], rsp['id'], {'timestamp': rsp['timestamp'], 'response': updated_response});
    }
}
function startwebsocket_updatedcallbacks(){
var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedcallbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            rsp = JSON.parse(event.data);
            if(callbacks[rsp.id]){
                callbacks[rsp.id]['last_checkin'] = rsp['last_checkin'];
                callbacks[rsp.id]['active'] = rsp['active'];
                if(rsp['active'] == false){
                    task_data.meta[rsp.id]['tasks'] = false;
                    task_data.meta[rsp.id]['screencaptures'] = false;
                    task_data.meta[rsp.id]['keylogs'] = false;
                }

            }
        }
    }
};
function updateClocks(){
    date = new Date();
    now = date.getTime() + date.getTimezoneOffset() * 60000;
    for(var key in callbacks){
        // update each 'last_checkin' time to be now - that value
        checkin_time = new Date(callbacks[key]['last_checkin']);
        callbacks[key]['real_time'] = timeConversion(now - checkin_time);
    }
}
function timeConversion(millisec){
    var seconds = Math.trunc(((millisec / 1000)) % 60);
    var minutes = Math.trunc(((millisec / (1000 * 60))) % 60);
    var hours = Math.trunc(((millisec / (1000 * 60 * 60))) % 24);
    var days = Math.trunc(((millisec / (1000 * 60 * 60 * 24))) % 365);
    return days + ":" + hours + ":" + minutes + ":" + seconds;
}
function generate_background_color(){
    //https://github.com/davidmerfield/randomColor
    var color = randomColor({luminosity: 'light'});
    return color;
}
function shadeBlend(p,c0,c1) {
    var n=p<0?p*-1:p,u=Math.round,w=parseInt;
    if(c0.length>7){
        var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
        return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
    }else{
        var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
        return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
    }
}

startwebsocket_callbacks();
setInterval(updateClocks, 50);

startwebsocket_updatedcallbacks();