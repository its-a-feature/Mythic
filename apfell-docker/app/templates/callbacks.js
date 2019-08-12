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

var callbacks = {}; //all callback data
var tasks = []; //current tasks we're displaying
var all_tasks = {}; //dictionary of arrays of tasks (for each callback's tasks)
var meta = {}; //dictionary of dictionary of metadata
var finished_callbacks = false;
var finished_tasks = false;
var ptype_cmd_params = {}; //where we keep track of payload type -> command -> command_parameter mappings for what has called in

var websockets = {};  // current open websocket dictionary
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks,
        filter: ""
    },
    methods: {
        interact_button: function(callback){
            try{
                if(websockets.hasOwnProperty(callback.id)){
                    websockets[callback.id].close();
                    delete websockets[callback.id];
                }
                websockets[callback.id] = startwebsocket_callback(callback.id);
            }catch(error){
                alertTop("danger", "Network connections not established yet, please click \"Interact\" again", 2);
                return;
            }
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

            task_data.input_field_placeholder['data'] = callback.user + "@" + callback.host + "(Callback:" + callback.id + ")";
            task_data.input_field_placeholder['cid'] = callback.id;
            Vue.set(task_data.meta[callback.id], 'tasks', true);
            task_data.meta[callback.id]['display'] = callback.user + "@" + callback.host + "(Callback: " + callback.id + ")";
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                // show loading data until we load all of our data in, then it will be automatically cleared
                //alertTop("success", "Getting current tasks and opening socket " + callback.id, 1);
            }, 0);
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#tasks' + callback.id.toString() + 'tab').click();
            }, 0);

            //set the autocomplete for the input field
            var autocomplete_commands = [];
            for(var i = 0; i < task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']].length; i++){
                autocomplete_commands.push(task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i].cmd );
            }
            autocomplete(document.getElementById("commandline"), autocomplete_commands );
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
        hide_tasks: function(callback){
            meta[callback.id]['tasks'] = false;
            meta[callback.id]['screencaptures'] = false;
            meta[callback.id]['keylogs'] = false;
            stop_getting_callback_updates(callback.id);
        },
        exit_callback: function(callback){
            //task the callback to exit on the host
            //for the given callback, find its payload type, that payload type's exit command, and issue that
            for(var i = 0; i < task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']].length; i++){
               if(task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i]['is_exit']){
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + callback['id'], null, "POST", {"command":task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i].cmd,"params":"", 'transform_status':{}});
               }
            }

        },
        remove_callback: function(callback){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],null,"PUT", {"active":"false"});
            stop_getting_callback_updates(callback.id);
            // also do the above for any additionally selected callbacks
            for(i in this.callbacks){
                if(this.callbacks[i]['selected']){
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + this.callbacks[i]['id'],null,"PUT", {"active":"false"});
                    stop_getting_callback_updates(this.callbacks[i]['id']);
                }
            }
        },
        show_screencaptures: function(callback){
            Vue.set(meta[callback.id], 'screencaptures', true);
            meta[callback.id]['display'] = callback.user + "@" + callback.host + "(Callback: " + callback.id + ")";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/bycallback/" + callback['id'],view_callback_screenshots,"GET");
        },
        show_keylogs: function(callback){
            Vue.set(meta[callback.id], 'keylogs', true);
            meta[callback.id]['display'] = callback.user + "@" + callback.host + "(Callback: " + callback.id + ")";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/callback/" + callback['id'],view_callback_keylogs,"GET");
        },
        view_loaded_commands: function(callback){
            //display all of the loaded commands and their versions for the selected callback
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'] + "/loaded_commands",view_loaded_commands_callback,"GET");
        },
        check_all_callbacks:function(){
            for(i in this.callbacks){
                if($('#all_callback_checkbox').is(":checked")){
                    this.callbacks[i]['selected'] = true;
                }else{
                    this.callbacks[i]['selected'] = false;
                }
            }
        },
        split_callback: function(callback){
            window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}/split_callbacks/" + callback.id, '_blank').focus();
        },
        toggle_lock: function(callback){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],toggle_lock_callback,"PUT", {"locked":!callback.locked});
        },
        apply_filter: function(callback){
            if(this.filter.includes(":")){
                pieces = this.filter.split(":");
                if(callback.hasOwnProperty(pieces[0])){
                    if(callback[pieces[0]].toString().includes(pieces[1])){
                        return true;
                    }
                    return false;
                }
                return callback.active;
            }
            return callback.active;
        }
    },
    delimiters: ['[[',']]']
});
function toggle_lock_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] == 'success'){
        //console.log(data);
        alertTop("success", "Successfully updated", 1);
    }else{
        alertTop("danger", data['error']);
    }
}
function get_all_tasking_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] == 'success'){
        //this has [callback_info, "tasks": [ {task_info, "responses": [ {response_info} ] } ] ]
        for(var i = 0; i < data['tasks'].length; i++){
            add_new_task(data['tasks'][i]);
            for(var j = 0; j < data['tasks'][i]['responses'].length; j++){
                add_new_response(data['tasks'][i]['responses'][j], false);  //the false indicates to start collapsed
            }
        }
        setTimeout(() => { // setTimeout to put this into event queue
            $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
        }, 0);
        setTimeout(() => { // setTimeout to put this into event queue
            // executed after render
            Vue.nextTick().then(function(){
                $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
            });
        }, 0);
    }
    else{
        alertTop("danger", data['error']);
    }
}
var loadedCommandModal = new Vue({
    el: '#loadedCommandModal',
    data: {
        loaded_commands: []
    },
    delimiters: ['[[',']]']
});
function view_loaded_commands_callback(response){
    try{
        data = JSON.parse(response);
    }
    catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] == 'success'){
        loadedCommandModal.loaded_commands = data['loaded_commands'];
        $( '#loadedCommandModal' ).modal('show');
    }
    else{
        alertTop("danger", data['error']);
    }
}
function stop_getting_callback_updates(id){
    //make sure we stop getting updates from the websockets
    try{
        remove_callback_from_view(id);
        if(websockets.hasOwnProperty('id')){
            websockets[id].close();
            delete websockets[id];
        }
    }catch(error){
        console.log(error.toString());
    }
}
function edit_description_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
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
        all_tasks,
        ptype_cmd_params, // list of transforms for the currently typed command and their 'active' status
        test_command: false
    },
    methods:{
        task_button: function(data){
            //submit the input_field data as a task, need to know the current callback id though
            //first check if there are any active auto-complete tabs. If there are, we won't submit.
            var autocomplete_list = document.getElementById('commandlineautocomplete-list');
            if( autocomplete_list != undefined && autocomplete_list.hasChildNodes()){
                return;
            }
            task = this.input_field.trim().split(" ");
            command = task[0].trim();
            params = "";
            if (task.length > 1){
                params = task.slice(1, ).join(' '); //join index 1 to the end back into a string of params
            }
            // first check to see if we have any information about this payload time to leverage
            if(this.ptype_cmd_params.hasOwnProperty(callbacks[data['cid']]['payload_type'])){
                //now loop through all of the commands we have to see if any of them match what was typed
                for(var i = 0; i < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']].length; i++){
                    //special category of trying to do a local help
                    if(command == "help"){
                        if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] == params){
                            alertTop("info", "<b>Usage: </b>" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['help_cmd'] +
                            "<br><b>Description:</b>" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['description'],0);
                            return;
                        }
                        else if(params.length == 0){
                            alertTop("info", "Usage: help {command_name}", 2);
                            return;
                        }
                    }
                    //special category of trying to do a local set command
                    else if(command == "set"){
                        if(task.length >= 3){
                            var set_value = task.slice(2, ).join(' ');
                            if(task[1] == "parent"){
                                set_value = parseInt(set_value);
                            }
                            var set_data = {};
                            set_data[task[1]] = set_value;
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + this.input_field_placeholder['cid'],
                            function(response){
                                try{
                                    var rdata = JSON.parse(response);
                                }catch(error){
                                    alertTop("danger", "Session expired, please refresh");
                                    return;
                                }
                                if(rdata['status'] == 'success'){
                                    alertTop("success", "Successfully modified current callback's metadata", 1);
                                    task_data.input_field = "";
                                }
                                else{
                                    alertTop("danger", "Failed to set current callback's metadata: " + rdata['error']);
                                }
                            }, "PUT", set_data);
                        }
                        else{
                            alertTop("danger", "Wrong number of params for set. Should be set {field} {value}");
                            return;
                        }
                        return;
                    }
                    //if we find our command that was typed
                    else if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] == command){
                        transform_status = {};
                        for(var j = 0; j < ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['transforms'].length; j++){
                            transform_status[ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['transforms'][j]['order']] = ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['transforms'][j]['active'];
                        }
                        // if they didn't type any parameters, but we have some registered for this command, display a GUI for them
                        if(params.length == 0 && this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length != 0){
                            //if somebody specified command arguments on the commandline without going through the GUI, by all means, let them
                            //  This is for if they want the GUI to auto populate for them
                            //  Also make sure that there are actually parameters for them to fill out
                            params_table.command_params = [];
                            for(var j = 0; j < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length; j++){
                                var blank_vals = {"string_value": "", "credential_value":"", "credential_id": 0, "number_value": -1, "choice_value": "", "choicemultiple_value": [], "boolean_value": false, "array_value": []}
                                var param = Object.assign({}, blank_vals, this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'][j]);
                                if(param.choices.length > 0){param.choice_value = param.choices.split("\n")[0];}
                                param.string_value = param.hint;
                                params_table.command_params.push(param);
                            }
                            $( '#paramsModalHeader' ).text(command + "'s Parameters");
                            var credentials = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials/current_operation"));
                            if(credentials['status'] == 'success'){
                                params_table.credentials = credentials['credentials'];
                            }
                            else{
                                alertTop("danger", credentials['error']);
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
                                var base_type = callback_table.callbacks[data['cid']].payload_type;
                                for( i in callback_table.callbacks ){
                                    // loop through and submit the task for all of the callbacks that are selected that match the payload type of the current one we entered the command on
                                    // also don't submit a test command to all of the agents
                                    //console.log(i);
                                    //console.log(callback_table.callbacks[i]);
                                    if(callback_table.callbacks[i]['selected'] && ! task_data.test_command){
                                        uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + i,post_task_callback_func,file_data,
                                                                    {"command":command,"params": JSON.stringify(param_data), "test_command": task_data.test_command, "transform_status": transform_status});
                                    }
                                }
                                if(task_data.test_command){
                                    //if it is a test command we can go ahead and send it down (since it would be skipped by the above)
                                    uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + i,post_task_callback_func,file_data,
                                    {"command":command,"params": JSON.stringify(param_data), "test_command": task_data.test_command, "transform_status": transform_status});
                                }

                                //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                                task_data.input_field = "";
                            });

                        }
                        else{
                            //somebody knows what they're doing or a command just doesn't have parameters, send it off
                           var base_type = callback_table.callbacks[data['cid']].payload_type;
                                for( i in callback_table.callbacks ){
                                //console.log(i);
                                //console.log(callback_table.callbacks[i]);
                                    // loop through and submit the task for all of the callbacks that are selected that match the payload type of the current one we entered the command on
                                    // also don't submit a test command to all of the agents
                                    if(callback_table.callbacks[i]['selected'] && ! task_data.test_command){
                                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + i,post_task_callback_func, "POST",
                                {"command":command,"params":params, "test_command": task_data.test_command, "transform_status": transform_status});
                                    }
                                }
                                if(task_data.test_command){
                                    //if it is a test command we can go ahead and send it down (since it would be skipped by the above)
                                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + i,post_task_callback_func, "POST",
                                {"command":command,"params":params, "test_command": task_data.test_command, "transform_status": transform_status});
                                }

                                //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                                task_data.input_field = "";
                        }
                        return;
                    }
                }
                //If we got here, that means we're looking at an unknown command
                if(command == "help"){
                    // just means we never found the param command to help out with
                    alertTop("warning", "Unknown command: " + params, 2);
                }
                else{
                    alertTop("warning", "Unknown command: " + command, 2);
                }
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
            //set the autocomplete for the input field
            var autocomplete_commands = [];
            for(var i = 0; i < this.ptype_cmd_params[callbacks[metadata.id]['payload_type']].length; i++){
                autocomplete_commands.push(this.ptype_cmd_params[callbacks[metadata.id]['payload_type']][i].cmd );
            }
            autocomplete(document.getElementById("commandline"), autocomplete_commands );
            Vue.nextTick().then(function(){
                $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
            });
        },
        toggle_image: function(image){
            var panel = document.getElementById(image.remote_path).nextElementSibling;
            if (panel.style.display === "") {
                panel.style.display = "none";
            } else {
                panel.style.display = "";
            }
        },
        toggle_arrow: function(taskid){
            $('#cardbody' + taskid).on('shown.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + taskid).on('hidden.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(0deg)");
            });
        },
        console_tab_close: function(metadata){
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
        },
        persist_transform_active_status: function(payload_type, cmd_index){
            for(var i = 0; i < this.ptype_cmd_params[payload_type][cmd_index]['transforms'].length; i++){
                //console.log(JSON.stringify(this.ptype_cmd_params[payload_type][cmd_index]['transforms'][i]));
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/bycommand/" + this.ptype_cmd_params[payload_type][cmd_index]['transforms'][i]['id'],
                    persist_transform_active_status_callback, "PUT", this.ptype_cmd_params[payload_type][cmd_index]['transforms'][i]);
            }

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
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, add_comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, remove_comment_callback, "DELETE", null);
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
        }
    },
    computed: {
        hasTransformsSet: function(){
            //returns true or false if the command has transforms set as active
            cmd = this.input_field.split(" ")[0];
            if(cmd){
                cid = this.input_field_placeholder['cid'];
                for(var i = 0; i < this.ptype_cmd_params[callbacks[cid]['payload_type']].length; i++){
                    if(cmd == this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['cmd']){
                        //we found the right command, now check to see if there are any transform associated that are set to active
                        for(var j = 0; j < this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['transforms'].length; j++){
                            if(this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['transforms'][j]['active'] == true){
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
            return false;
        },
        get_cmd_index: function(){
            cmd = this.input_field.split(" ")[0];
            cid = this.input_field_placeholder['cid'];
            if(cmd != ""){
                for(var i = 0; i < this.ptype_cmd_params[callbacks[cid]['payload_type']].length; i++){
                    if(cmd == this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['cmd']){
                        return i;
                    }
                }
            }
            return -1;
        },
        get_payload_type: function(){
            cid = this.input_field_placeholder['cid'];
            if(cid != -1){
                return callbacks[cid]['payload_type'];
            }
            return null;
        },
        taskable: function(){
            cid = this.input_field_placeholder['cid'];
            if(cid == -1){
                return false;
            }
            if(callbacks[cid]['locked']){
                if(callbacks[cid]['locked_operator'] == "{{username}}"){
                    return true;
                }else{
                    return false;
                }
            }else{
                return true;
            }
        }
    },
    delimiters: ['[[', ']]'],
});
function add_comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }
}
function remove_comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }
}
function persist_transform_active_status_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }else{
        alertTop("success", "Successfully persisted", 1);
    }
}
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

        },
        split_input_params: function(param, index){
            if(param.array_value[index].includes("\n")){
                pieces = param.array_value[index].split("\n");
                for(i = 1; i < pieces.length; i++){
                    param.array_value.push(pieces[i]);
                }
                param.array_value[index] = pieces[0];
            }
        }
    },
    delimiters: ['[[',']]']
});
function view_callback_screenshots(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
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
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] == "success"){
        //meta[data['callback']]['keylog_data'] = [];
        console.log(data['keylogs']);
        Vue.set(meta[data['callback']], 'keylog_data', data['keylogs']);
    }
    else{
        alertTop("danger", data['error']);
    }
}
function post_task_callback_func(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
        task_data.input_field = data['cmd'] + " " + data['params'];
    }
}
function startwebsocket_callbacks(){
    alertTop("info", "Loading callbacks...", 1);
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            cb = JSON.parse(event.data);
            if(!cb['active']){return;}
            add_callback_to_view(cb);
        }
        else{
            if(finished_callbacks == false){
                startwebsocket_commands();
                finished_callbacks = true;
            }
        }
    };
    ws.onclose = function(){
        alertTop("danger", "New Callbacks Socked closed. Please reload the page");
    }
    ws.onerror = function(){
        alertTop("danger", "New Callbacks Socket errored. Please reload the page");
    }
};
function  remove_callback_from_view(id){
    // clear out the data from memory
    Vue.set(task_data.meta[id], 'data', []);
    Vue.set(all_tasks, id, {});
}
function add_callback_to_view(cb){
    var color = generate_background_color(cb['id']);
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
                                       'keylogs': false,
                                       'description': cb['description'],
                                       'payload_description': cb['payload_description']});
    // check to see if we have this payload type in our list, if not, request the commands for it
    if( !task_data.ptype_cmd_params.hasOwnProperty(cb['payload_type'])){
        task_data.ptype_cmd_params[cb['payload_type']] = [];
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + cb['payload_type'] + "/commands", register_new_command_info, "GET", null);
    }
}
function  update_callback_in_view(rsp){
    if(callbacks[rsp.id]){
        //if the callback already exists in our view, update it
        callbacks[rsp.id]['last_checkin'] = rsp['last_checkin'];
        callbacks[rsp.id]['active'] = rsp['active'];
        callbacks[rsp.id]['description'] = rsp['description'];
        meta[rsp.id]['description'] = rsp['description'];
        callbacks[rsp.id]['locked'] = rsp['locked'];
        callbacks[rsp.id]['locked_operator'] = rsp['locked_operator'];
        if(rsp['active'] == false){
            task_data.meta[rsp.id]['tasks'] = false;
            task_data.meta[rsp.id]['screencaptures'] = false;
            task_data.meta[rsp.id]['keylogs'] = false;
        }
    }else{
        //callback isn't available in our view,  so load it up
        add_callback_to_view(rsp);
    }
}
//we will get back a series of commands and their parameters for a specific payload type, keep track of this in ptype_cmd_params so we can
//  respond to help requests and build dynamic forms for getting command data
function register_new_command_info(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] == "success"){
        delete data['status'];
        if(data['commands'].length > 0){
            data['commands'].push({"cmd": "help", "params":[],"transforms":[]});
            data['commands'].push({"cmd": "set", "params":[],"transforms":[]});
            data['commands'].push({"cmd": "tasks", "params":[],"transforms":[]});
            data['commands'].push({"cmd": "clear", "params":[],"transforms":[]});
            task_data.ptype_cmd_params[data['commands'][0]['payload_type']] = data['commands'];
        }
    }
    else{
        alertTop("danger", data['error']);
    }
}

function add_new_task(tsk){
    try{
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
        if( tsk.id in all_tasks[tsk['callback']] ){
            // we already have this task, so we're actually going to update it
            Vue.set(all_tasks[tsk['callback']], tsk['id'], Object.assign({}, all_tasks[tsk.callback][tsk.id], tsk));
        }
        else{
            tsk.href = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + tsk.id;
            tsk.use_scripted = false;
            Vue.set(all_tasks[tsk['callback']], tsk['id'], tsk);
            task_data.meta[tsk['callback']]['history'].push(tsk['command'] + " " + tsk['original_params']); // set up our cmd history
            task_data.meta[tsk['callback']]['history_index'] = task_data.meta[tsk['callback']]['history'].length;
            // in case this is the first task and we're waiting for it to show up, reset this
            if(!task_data.meta.hasOwnProperty(tsk['callback'])){
                task_data.meta[tsk['callback']] = {};
            }
            task_data.meta[tsk['callback']].data = all_tasks[tsk['callback']];
            if( Math.abs((Math.floor($('#bottom-tabs-content').scrollTop()) + $('#bottom-tabs-content').height() - $('#bottom-tabs-content')[0].scrollHeight)) < 40 ){
                setTimeout(() => { // setTimeout to put this into event queue
                    // executed after render
                    Vue.nextTick().then(function(){
                        $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
                    });
                }, 0);
            }
        }
     }catch(e){
        console.log("error in add_new_task");
        console.log(e.stack());
        console.log(e.toString());
     }
}

function add_new_response(rsp, from_websocket){
    try{
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
            var updated_response = rsp['response'];//.replace(/\\n|\r/g, '\n');
            // all_tasks->callback->task->response->id = timestamp, responsevalue
            Vue.set(all_tasks[rsp['task']['callback']] [rsp['task']['id']] ['response'], rsp['id'], {'timestamp': rsp['timestamp'], 'response': updated_response});

            //now that the new response has been added, potentially update the scripted version
            if(browser_scripts.hasOwnProperty(rsp['task']['command_id'])){
                all_tasks[rsp['task']['callback']][rsp['task']['id']]['use_scripted'] = true;
                all_tasks[rsp['task']['callback']][rsp['task']['id']]['scripted'] = browser_scripts[rsp['task']['command_id']](rsp['task'], Object.values(all_tasks[rsp['task']['callback']][rsp['task']['id']]['response']));
            }
            if(from_websocket){
                //we want to make sure we have this expanded by default
                if(Math.floor($('#bottom-tabs-content').scrollTop()) + $('#bottom-tabs-content').height() == $('#bottom-tabs-content')[0].scrollHeight){
                    $('#cardbody' + rsp['task']['id']).collapse('show');
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function(){
                        $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
                        $('#color-arrow' + rsp['task']['id']).css("transform", "rotate(180deg)");
                    });
                }else{
                    $('#cardbody' + rsp['task']['id']).collapse('show');
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function(){
                        $('#color-arrow' + rsp['task']['id']).css("transform", "rotate(180deg)");
                    });
                }
            }
        }
    }catch(error){
        console.log(error.toString());
    }
}


function startwebsocket_updatedcallbacks(){
var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedcallbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            var rsp = JSON.parse(event.data);
            update_callback_in_view(rsp);
        }
    };
    ws.onclose = function(){
        alertTop("danger", "Socked closed. Please reload the page");
    }
    ws.onerror = function(){
        alertTop("danger", "Socket errored. Please reload the page");
    }
};
function startwebsocket_newkeylogs(){
var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/keylogs/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            var rsp = JSON.parse(event.data);
            //console.log(rsp);
            var key_stroke_alert = rsp['keystrokes'];
            alertTop("success", "<b>New Keylog from " + rsp['task'] + ": </b><pre>" + key_stroke_alert + "</pre>", 8);
            //console.log(rsp);


        }
    };
    ws.onclose = function(){
        alertTop("danger", "Socked closed. Please reload the page");
    }
    ws.onerror = function(){
        alertTop("danger", "Socket errored. Please reload the page");
    }
};startwebsocket_newkeylogs();
function startwebsocket_commands(){
var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/all_command_info');
    ws.onmessage = function(event){
        if (event.data != ""){
            var data = JSON.parse(event.data);
            // first determine if we're dealing with command, parameter, or transform
            if(data['notify'].includes("parameters")){
                // we're dealing with new/update/delete for a command parameter
                for(var i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                    if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] == data['cmd']){
                        // now we need to do something with a param in task_data.ptype_cmd_params[data['payload_type']][i]['params']
                        if(data['notify'] == "newcommandparameters"){
                            // we got a new parameter, so just push it
                            task_data.ptype_cmd_params[data['payload_type']][i]['params'].push(data);
                            alertTop("info", data['cmd'] + " had a parameter added in " + data['payload_type'], 10);
                            return;
                        }
                        for(var j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['params'].length; j++){
                            // now we're either updating or deleting, so we need to find that param
                            if(data['name'] == task_data.ptype_cmd_params[data['payload_type']][i]['params'][j]['name']){
                                if(data['notify'] == "deletedcommandparameters"){
                                    // now we found the parameter to remove
                                    task_data.ptype_cmd_params[data['payload_type']][i]['params'].splice(j, 1);
                                    alertTop("info", data['cmd'] + " had a parameter removed in " + data['payload_type'], 10);
                                    return;
                                }
                                else{
                                    // we're editing the parameter and found the one to edit
                                    Vue.set(task_data.ptype_cmd_params[data['payload_type']][i]['params'], j, data);
                                    alertTop("info", data['cmd'] + " had a parameter edited in " + data['payload_type'], 10);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            else if(data['notify'].includes("transform")){
                // we're dealing with new/update/delete for a command transform
                for(var i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                    if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] == data['command'] || task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] == data['cmd']){
                        // now we need to do something with a transform in task_data.ptype_cmd_params[data['payload_type']][i]['transforms']
                        if(data['notify'] == "newcommandtransform"){
                            // we got a new transform, so just push it
                            task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].push(data);
                            alertTop("info", task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] + " had a transform added in " + data['payload_type'], 10);
                            return;
                        }
                        for(var j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].length; j++){
                            if(data['id'] == task_data.ptype_cmd_params[data['payload_type']][i]['transforms'][j]['id']){
                                // now we're either updating or deleting
                                if(data['notify'] == "deletedcommandtransform"){
                                    task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].splice(j, 1);
                                    alertTop("info", task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] + " had a transform removed in " + data['payload_type'], 10);
                                }
                                else{
                                    // we're editing the parameter not deleting it
                                    Vue.set(task_data.ptype_cmd_params[data['payload_type']][i]['transforms'], j, data);
                                    alertTop("info", task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] + " had a transform edited in " + data['payload_type'], 10);
                                }
                            }
                        }
                        return;
                    }
                }
            }
            else{
                // we're dealing with new/update/delete for a command
                if(data['notify'] == "newcommand"){
                    data['params'] = [];
                    data['transforms'] = [];
                    task_data.ptype_cmd_params[data['payload_type']].push(data);
                    alertTop("info", data['cmd'] + " is a new command for " + data['payload_type'], 10);
                    return;
                }
                else if(data['notify'] == "deletedcommand"){
                    // we don't get 'payload_type' like normal, instead, we get payload_type_id which doesn't help
                    for (const [key, value] of Object.entries(task_data.ptype_cmd_params)) {
                      for(var i = 0; i < value.length; i++){
                        if(value[i]['id'] == data['id']){
                            // we found the value to remove
                            task_data.ptype_cmd_params[key].splice(i, 1);
                            alertTop("info", data['cmd'] + " is a no longer a command for " + data['payload_type'], 10);
                            return;
                        }
                      }
                    }
                }
                else{
                    for(var i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                        if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] == data['cmd']){
                            Vue.set(task_data.ptype_cmd_params[data['payload_type']], i, Object.assign({}, task_data.ptype_cmd_params[data['payload_type']][i], data));
                            alertTop("info", data['cmd'] + " general info has been updated " + data['payload_type'], 10);
                        }
                    }
                }
            }

        }
    };
    ws.onclose = function(){
        alertTop("danger", "Socked closed. Please reload the page");
    }
    ws.onerror = function(){
        alertTop("danger", "Socket errored. Please reload the page");
    }
};
function updateClocks(){
    var date = new Date();
    var now = date.getTime() + date.getTimezoneOffset() * 60000;
    for(var key in callbacks){
        // update each 'last_checkin' time to be now - that value
        var checkin_time = new Date(callbacks[key]['last_checkin']);
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
function generate_background_color(cid){
    //https://github.com/davidmerfield/randomColor
    if( '{{config["new-callback-hue"]}}' != ''){
        var color = randomColor({luminosity: '{{ config["new-callback-color"] }}', hue:'{{config["new-callback-hue"]}}', seed: cid});
    }
    else{
        var color = randomColor({luminosity: '{{ config["new-callback-color"] }}', seed: cid});
    }
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

startwebsocket_callbacks();  // get new callbacks brought into the UI
setInterval(updateClocks, 50); // update every 50 ms

startwebsocket_updatedcallbacks();  // update  callback  views in the UI

function startwebsocket_callback(cid){
    // get updated information about our callback
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/unified_callback/' + cid);
    ws.onmessage = function(event){
        if (event.data != ""){
            var data = JSON.parse(event.data);
            //console.log("got new message through websocket: " + event.data);
            if(data['channel'] == "updatedcallback"){
                update_callback_in_view(data);
            }else if(data['channel'].includes("task")){
                add_new_task(data);
            }else if(data['channel'].includes("response")){
                add_new_response(data, true);
            }else{
                console.log("Unknown message from server: " + event.data);
            }
        }
    };
    ws.onclose = function(event){
        console.log("closed socket " + cid);
        //alertTop("danger", "Socket for callback " + cid +  " closed", 2);
    }
    ws.onerror = function(event){
        console.log("errored socket " + cid);
        //alertTop("danger", "Socket for callback " + cid +  " closed", 2);
    }
    return ws;
};

//autocomplete function taken from w3schools: https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function(e) {
      var a, b, i, val = task_data.input_field;
      var longest = 0;
      /*close any already open lists of autocompleted values*/
      closeAllLists();
      if (!val) { return false;}
      currentFocus = -1;
      /*create a DIV element that will contain the items (values):*/
      a = document.createElement("DIV");
      a.setAttribute("id", this.id + "autocomplete-list");
      a.setAttribute("class", "autocomplete-items");
      /*append the DIV element as a child of the autocomplete container:*/
      this.parentNode.appendChild(a);
      /*for each item in the array...*/
      for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
        if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
          /*create a DIV element for each matching element:*/
          if(arr[i].length > longest){ longest = arr[i].length;}
          b = document.createElement("DIV");
          /*make the matching letters bold:*/
          b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
          b.innerHTML += arr[i].substr(val.length);
          /*insert a input field that will hold the current array item's value:*/
          b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
          /*execute a function when someone clicks on the item value (DIV element):*/
          b.addEventListener("click", function(e) {
              /*insert the value for the autocomplete text field:*/
              task_data.input_field = this.getElementsByTagName("input")[0].value;
              /*close the list of autocompleted values,
              (or any other open lists of autocompleted values:*/
              closeAllLists();
          });
          a.appendChild(b);
        }
        a.style.width = longest + 1 + "em";
      }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keyup", function(e) {
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 39) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 37) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        closeAllLists("");
      }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
    task_data.input_field = x[currentFocus].getElementsByTagName("input")[0].value;
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
};

(function() {
  // hold onto the drop down menu
  var dropdownMenu;

  // and when you show it, move it to the body
  $(window).on('show.bs.dropdown', function(e) {

    // grab the menu
    dropdownMenu = $(e.target).find('.dropdown-menu');

    // detach it and append it to the body
    $('body').append(dropdownMenu.detach());

    // grab the new offset position
    var eOffset = $(e.target).offset();

    // make sure to place it where it would normally go (this could be improved)
    dropdownMenu.css({
        'display': 'block',
        'top': eOffset.top + $(e.target).outerHeight(),
        'left': eOffset.left
    });
  });

  // and when you hide it, reattach the drop down, and hide it normally
  $(window).on('hide.bs.dropdown', function(e) {
    $(e.target).append(dropdownMenu.detach());
    dropdownMenu.hide();
  });
})();