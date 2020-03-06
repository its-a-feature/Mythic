
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
// Get the initial set of data about our callback and already known commands/responses
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/{{cid}}/all_tasking",get_all_tasking_callback,"GET",null);
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/",get_callback_options_callback,"GET",null);
// Vue that we'll use to display everything
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks: {},
        ptype_cmd_params: {}, //where we keep track of payload type -> command -> command_parameter mappings for what has called in
        callback_options: [],
        task_filters: {"task": {"active": false, "range_low": 0, "range_high": 1000000},
                       "operator": {"active": false, "username": ""},
                       "command": {"active": false, "cmd": ""}}
    },
    methods: {
        task_button: function(data){
                //submit the input_field data as a task, need to know the current callback id though
                //first check if there are any active auto-complete tabs. If there are, we won't submit.
                var autocomplete_list = document.getElementById(data.id + 'commandlineautocomplete-list');
                if( autocomplete_list !== null && autocomplete_list.hasChildNodes()){
                    alertTop("warning", "submission error");
                    return;
                }
                task = this.callbacks[data.id].input_field.trim().split(" ");
                command = task[0].trim();
                params = "";
                if (task.length > 1){
                    params = task.slice(1, ).join(' '); //join index 1 to the end back into a string of params
                }
                // first check to see if we have any information about this payload time to leverage
                if(this.ptype_cmd_params.hasOwnProperty(this.callbacks[data['id']]['payload_type'])){
                    //now loop through all of the commands we have to see if any of them match what was typed
                    for(let i = 0; i < this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']].length; i++){
                        //special category of trying to do a local help
                        if(command === "help"){
                            if(this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['cmd'] === params){
                                alertTop("info", "<b>Usage: </b>" + this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['help_cmd'] +
                                "<br><b>Description:</b><pre style=\"word-wrap:break-word;white-space:pre-wrap\">" + this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['description'] +
                                    "</pre><br><b>Note: </b>All commands for " +  this.callbacks[data['id']]['payload_type'] +
                                    " can be found in the <a target='_blank' href=\"{{links.apiui_command_help}}?command=" + this.callbacks[data['id']]['payload_type'] + "\" style='color:darkblue'> Help Page</a>",0);
                                return;
                            }
                            else if(params.length === 0){
                                alertTop("info", "Usage: help {command_name}", 2);
                                return;
                            }
                        }
                        //special category of trying to do a local set command
                        else if(command === "set"){
                            if(task.length >= 3){
                                var set_value = task.slice(2, ).join(' ');
                                if(task[1] === "parent"){
                                    set_value = parseInt(set_value);
                                }
                                var set_data = {};
                                set_data[task[1]] = set_value;
                                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + data['id'],
                                function(response){
                                    try{
                                        var rdata = JSON.parse(response);
                                    }catch(error){
                                        alertTop("danger", "Session expired, please refresh");
                                        return;
                                    }
                                    if(rdata['status'] === 'success'){
                                        alertTop("success", "Successfully modified current callback's metadata", 1);
                                        callback_table.callbacks[data['id']].input_field = "";
                                    }
                                    else{
                                        alertTop("danger", "Failed to set current callback's metadata: " + rdata['error']);
                                        //$("#middle-alert").fadeTo(2000, 500).slideUp(500, function(){
                                        //      $("#middle-alert").slideUp(500);
                                        //});
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
                        else if(this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['cmd'] === command){
                            transform_status = {};
                            for(let j = 0; j < this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['transforms'].length; j++){
                                transform_status[this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['transforms'][j]['order']] = this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['transforms'][j]['active'];
                            }
                            // if they didn't type any parameters, but we have some registered for this command, display a GUI for them
                            if(params.length === 0 && this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'].length !== 0){
                                //if somebody specified command arguments on the commandline without going through the GUI, by all means, let them
                                //  This is for if they want the GUI to auto populate for them
                                //  Also make sure that there are actually parameters for them to fill out
                                params_table.command_params = [];
                                params_table.cmd = this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i];
                                for(let j = 0; j < this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'].length; j++){
                                    let blank_vals = {"string_value": "", "credential_value":"", "credential_id": 0, "number_value": -1, "choice_value": "", "choicemultiple_value": [], "boolean_value": false, "array_value": [],'payloadlist_value': "", 'agentconnect_c2profile': -1, 'agentconnect_host': "", "agentconnect_payload": ""};
                                    let param = Object.assign({}, blank_vals, this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'][j]);
                                    if(param.choices.length > 0){param.choice_value = param.choices.split("\n")[0];}
                                    param.string_value = param.hint;
                                    params_table.command_params.push(param);
                                }
                                let credentials = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials/current_operation"));
                                if(credentials['status'] === 'success'){
                                    params_table.credentials = credentials['credentials'];
                                }
                                else{
                                    alertTop("danger", credentials['error']);
                                    return;
                                }
                                $( '#paramsModal' ).modal('show');
                                $( '#paramsSubmit' ).unbind('click').click(function(){
                                    let param_data = {};
                                    let file_data = {};  //mapping of param_name to uploaded file data
                                    for(let k = 0; k < params_table.command_params.length; k++){
                                        if(params_table.command_params[k]['type'] === "String"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['string_value']; }
                                        else if(params_table.command_params[k]['type'] === "Credential"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['credential_value']; }
                                        else if(params_table.command_params[k]['type'] === "Number"){  param_data[params_table.command_params[k]['name']] = parseInt(params_table.command_params[k]['number_value']); }
                                        else if(params_table.command_params[k]['type'] === "Choice"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choice_value']; }
                                        else if(params_table.command_params[k]['type'] === "ChoiceMultiple"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choicemultiple_value']; }
                                        else if(params_table.command_params[k]['type'] === "Boolean"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['boolean_value']; }
                                        else if(params_table.command_params[k]['type'] === "Array"){  param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['array_value']; }
                                        else if(params_table.command_params[k]['type'] === "File"){
                                            let param_name = params_table.command_params[k]['name'];
                                            file_data[param_name] = document.getElementById('fileparam' + param_name).files[0];
                                            param_data[param_name] = "FILEUPLOAD";
                                        }else if(params_table.command_params[k]['type'] === 'PayloadList'){
                                            param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['payloadlist_value'];
                                        }else if(params_table.command_params[k]['type'] === 'AgentConnect') {
                                            param_data[params_table.command_params[k]['name']] = {
                                                "host": params_table.command_params[k]['agentconnect_host']
                                            };
                                            if (params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['type'] === 'payload') {
                                                param_data[params_table.command_params[k]['name']]['target'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['uuid'];
                                            } else {
                                                param_data[params_table.command_params[k]['name']]['target'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['agent_callback_id'];
                                            }
                                            if (params_table.command_params[k]['agentconnect_c2profile'] === -1) {
                                                // they didn't select a specific c2 profile, so send the list
                                                param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['supported_profiles'];
                                            } else {
                                                param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['supported_profiles'][params_table.command_params[k]['agentconnect_c2profile']];
                                            }
                                        }
                                    }
                                    //if it is a test command we can go ahead and send it down (since it would be skipped by the above)
                                    uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['id'], post_task_callback_func, file_data,
                                    {"command":command,"params": JSON.stringify(param_data), "test_command": callback_table.callbacks[data['id']].test_command, "transform_status": transform_status});

                                    //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                                    callback_table.callbacks[data['id']].input_field = "";
                                });

                            }
                            else{
                                //somebody knows what they're doing or a command just doesn't have parameters, send it off
                                //if it is a test command we can go ahead and send it down (since it would be skipped by the above)
                                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['id'],post_task_callback_func, "POST",
                                    {"command":command,"params":params, "test_command": this.callbacks[data['id']].test_command, "transform_status": transform_status});

                                //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                                this.callbacks[data['id']].input_field = "";
                            }
                            return;
                        }
                    }
                    //If we got here, that means we're looking at an unknown command
                    if(command === "help"){
                        // just means we never found the param command to help out with
                        alertTop("warning", "Unknown command: " + params, 2);
                    }
                    else{
                        if(command !== ""){
                            alertTop("warning", "Unknown command: " + command, 2);
                        }
                    }
                }

            },
        cmd_history_up: function(callback){
            if( $('.autocomplete-items').children().length > 0){return;}
            callback['history_index'] -= 1;
            if( callback['history_index'] < 0){
                callback['history_index'] = 0;
            }
            let index = callback['history_index'];
            callback.input_field = callback['history'][index];

        },
        cmd_history_down: function(callback){
            if( $('.autocomplete-items').children().length > 0){return;}
            callback['history_index'] += 1;
            if( callback['history_index'] >= callback['history'].length){
               callback['history_index'] = callback['history'].length;
               callback.input_field = "";
            }else{
                let index = callback['history_index'];
                callback.input_field = callback['history'][index];
            }
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
        persist_transform_active_status: function(payload_type, cmd_index){
            for(let i = 0; i < this.ptype_cmd_params[payload_type][cmd_index]['transforms'].length; i++){
                //console.log(JSON.stringify(this.ptype_cmd_params[payload_type][cmd_index]['transforms'][i]));
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/bycommand/" + this.ptype_cmd_params[payload_type][cmd_index]['transforms'][i]['id'],
                    persist_transform_active_status_callback, "PUT", this.ptype_cmd_params[payload_type][cmd_index]['transforms'][i]);
            }
        },
        toggle_show_params: function(id){
            let img = document.getElementById("toggle_task" + id).nextElementSibling;
            if (img.style.display === "") {
                img.style.display = "none";
            } else {
                img.style.display = "";
            }
        },
        toggle_arrow: function(taskid){
            $('#cardbody' + taskid).on('shown.bs.collapse', function(){
                get_all_responses(taskid);
                $('#color-arrow' + taskid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + taskid).on('hidden.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(0deg)");
            });
        },
        add_comment: function(task){
            $( '#addCommentTextArea' ).val(task.comment);
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
                $("#addCommentTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $( '#addCommentSubmit' ).click();
                    }
                });
            });
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
        },
        hasTransformsSet: function(callback_id){
            //returns true or false if the command has transforms set as active
            if(this.callbacks[callback_id] === undefined){return false}
            let cmd = this.callbacks[callback_id].input_field.split(" ")[0];
            if(cmd){
                for(let i = 0; i < this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']].length; i++){
                    if(cmd === this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']][i]['cmd']){
                        //we found the right command, now check to see if there are any transform associated that are set to active
                        for(let j = 0; j < this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']][i]['transforms'].length; j++){
                            if(this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']][i]['transforms'][j]['active'] === true){
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
            return false;
        },
        get_cmd_index: function(callback_id){
            if(this.callbacks[callback_id] === undefined){return -1}
            let cmd = this.callbacks[callback_id].input_field.split(" ")[0];
            if(cmd !== ""){
                for(let i = 0; i < this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']].length; i++){
                    if(cmd === this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']][i]['cmd']){
                        return i;
                    }
                }
            }
            return -1;
        },
        get_payload_type: function(callback_id){
            return this.callbacks[callback_id]['payload_type'];
        },
        add_callback_to_table: function(){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + $('#callback_options_select').val() + "/all_tasking",get_all_tasking_callback,"GET",null);
        },
        remove_callback: function(callback){
            Vue.delete(this.callbacks, callback.id);
        },
        apply_filter: function(task){
            // determine if the specified task should be displayed based on the task_filters set
            let status = true;
            if(this.task_filters['task']['active'] && task.id !== undefined){
                status = status && task.id <= this.task_filters['task']['range_high'] && task.id >= this.task_filters['task']['range_low'];
            }
            if(this.task_filters['operator']['active'] && task.operator !== undefined){
                status = status && task.operator.includes(this.task_filters['operator']['username']);
            }
            if(this.task_filters['command']['active'] && task.command !== undefined){
                status = status && task.command.includes(this.task_filters['command']['cmd']);
            }
            // if nothing is active, default to true
            return status;
        }
    },
    computed:{
        hasFiltersSet: function(){
          return this.task_filters['task']['active'] || this.task_filters['operator']['active'] || this.task_filters['command']['cmd'];
        },
    },
    delimiters: ['[[',']]'],
});
function get_all_responses(taskid){
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid, (response)=>{
         try{
             let data = JSON.parse(response);
             //console.log(data);
             callback_table.callbacks[data['task']['callback']]['tasks'][data['task']['id']]['expanded'] = true;
             //all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded'] = true;
             for(let resp in data['responses']){
                 //data['responses'][resp]['callback'] = data['callback']['id'];
                 //console.log(data['responses'][resp]);
                 add_new_response(data['responses'][resp], false);
             }
         }catch(error){
             console.log(error);
             alertTop("danger", "Session expired, please refresh");
         }
     }, "GET", null);
}
function get_callback_options_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
        return;
    }
    callback_table.callback_options = data;
    callback_table.callback_options.sort((a,b) =>(b.id > a.id) ? 1 : ((a.id > b.id) ? -1 : 0));

}
function get_all_tasking_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
        return;
    }

    if(data['status'] === 'success'){
        temp = {};
        temp['tasks'] = {};
        temp['real_time'] = "0:0:0:0";
        temp['display'] = '';
        temp['history'] = [];
        temp['history_index'] = 0;
        temp['description'] = data['description'];
        document.title = data['description'];
        temp['payload_description'] = data['payload_description'];
        temp['user'] = data['user'];
        temp['pid'] = data['pid'];
        temp['host'] = data['host'];
        temp['payload_type'] = data['payload_type'];
        temp['c2_profile'] = data['c2_profile'];
        temp['input_field'] = "";
        temp['input_field_placeholder'] = data['user'] + "@" + data['host'] + "(" + data['pid'] + ")";
        temp['init_callback'] = data['init_callback'];
        temp['last_checkin'] = data['last_checkin'];
        temp['operator'] = data['operator'];
        temp['test_command'] = false;
        temp['id'] = data['id'];
        temp['locked'] = data['locked'];
        temp['locked_operator'] = data['locked_operator'];
        Vue.set(callback_table.callbacks, data['id'], temp);
        //this has [callback_info, "tasks": [ {task_info, "responses": [ {response_info} ] } ] ]
        //console.log(data);
        Vue.nextTick(function(){
            if(data.hasOwnProperty('tasks')){
                for(let i = 0; i < data['tasks'].length; i++){
                    add_new_task(data['tasks'][i]);
                }
            }
        });
        temp['type'] = 'callback';
        Vue.nextTick().then(function(){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + data['payload_type'] + "/commands", register_new_command_info, "GET", null);
            startwebsocket_callback(data['id']);
            if( params_table.payloadonhost.hasOwnProperty(temp['host'])){
                // just add to the list
                Vue.set(params_table.payloadonhost[temp['host']], params_table.payloadonhost[temp['host']].length + 1, temp);
                //params_table.payloadonhost[cb['host']].push(cb);
            }else{
                Vue.set(params_table.payloadonhost, temp['host'], [temp]);
                //params_table.payloadonhost[cb['host']] = [cb];
            }
        });
    }
    else{
        alertTop("danger", data['error']);
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
    if(data['status'] === "success"){
        delete data['status'];
        data['commands'].push({"cmd": "help", "params":[],"transforms":[]});
        data['commands'].push({"cmd": "set", "params":[],"transforms":[]});
        data['commands'].push({"cmd": "tasks", "params":[],"transforms":[]});
        data['commands'].push({"cmd": "clear", "params":[],"transforms":[]});
        callback_table.ptype_cmd_params[data['commands'][0]['payload_type']] = data['commands'];
        autocomplete_commands = [];
        for(let i = 0; i < data['commands'].length; i++){
            autocomplete_commands.push(data['commands'][i].cmd );
        }
        for(let id in callback_table.callbacks){
            if(callback_table.callbacks[id]['payload_type'] === data['commands'][0]['payload_type']){
                //console.log("about to set autocomplete for " + id + ":" + data['commands'][0]['payload_type']);
                //input = document.getElementById("commandline:" + data['commands'][0]['payload_type'] + ":" + id);
                autocomplete(document.getElementById("commandline:" + data['commands'][0]['payload_type'] + ":" + id), autocomplete_commands );
            }
        }
    }
    else{
        alertTop("danger", data['error']);
    }
}
function add_new_task(tsk){
    try{
        //console.log("in add_new_task: " + JSON.stringify(tsk));
        if( tsk.id in callback_table.callbacks[tsk['callback']]['tasks']){
            // we already have this task, so we're actually going to update it
            Vue.set(callback_table.callbacks[tsk['callback']]['tasks'], tsk['id'], Object.assign({}, callback_table.callbacks[tsk['callback']]['tasks'][tsk.id], tsk));
        }
        else{
            tsk.href = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + tsk.id;
            let tmp = Object.assign({}, tsk);
            delete tmp['responses'];

            Vue.set(callback_table.callbacks[tsk['callback']]['tasks'], tsk['id'], tmp);
            callback_table.callbacks[tsk['callback']]['history'].push(tsk['command'] + " " + tsk['original_params']); // set up our cmd history
            callback_table.callbacks[tsk['callback']]['history_index'] = callback_table.callbacks[tsk['callback']]['history'].length;
            if( Math.abs((Math.floor($('#callbackoutput' + tsk['callback']).scrollTop()) + $('#callbackoutput' + tsk['callback']).height() - $('#callbackoutput' + tsk['callback'])[0].scrollHeight)) < 40){
                setTimeout(() => {
                    Vue.nextTick(function(){
                        //if we're looking at the bottom of the content, scroll
                        $('#callbackoutput' + tsk['callback']).scrollTop($('#callbackoutput' + tsk['callback'])[0].scrollHeight);
                    });
                }, 0);
            }
        }
     }catch(e){
        console.log(e);
        console.log(e.toString());
     }
}
function add_new_response(rsp, from_websocket){
    //console.log("got  response");
    try{
        if(rsp['task']['id'] in callback_table.callbacks[rsp['task']['callback']]['tasks']){

            //now that we found the right task, check to see if this is the first response or not
            if(callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses'] === undefined){
                //but we haven't received any responses for the specified task_id
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses'] = {};
            }
            //console.log(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']]);
            var updated_response = rsp['response'];
            Vue.set(callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses'], rsp['id'], {'timestamp': rsp['timestamp'], 'response': updated_response});
            callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['use_scripted'] = false;
            if(browser_scripts.hasOwnProperty(rsp['task']['command_id'])){
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['use_scripted'] = true;
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['scripted'] = browser_scripts[rsp['task']['command_id']](rsp['task'],  Object.values(callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses']));
            }
            if(from_websocket){
                //we want to make sure we have this expanded by default
                $('#cardbody' + rsp['task']['id']).collapse('show');
                let el = document.getElementById('callbackoutput' + rsp['task']['callback']);
                if( el.scrollHeight - el.scrollTop - el.clientHeight < 1 ){
                    //if we're looking at the bottom of the content, scroll
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function(){
                         $('#callbackoutput' + rsp['task']['callback']).scrollTop($('#callbackoutput' + rsp['task']['callback'])[0].scrollHeight);
                         $('#color-arrow' + rsp['task']['id']).css("transform", "rotate(180deg)");
                    });
                }else{
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function(){
                        $('#color-arrow' + rsp['task']['id']).css("transform", "rotate(180deg)");
                    });
                }
            }
        }
    }catch(error){
        console.log("error in add_new_response");
        console.log(error.stack);
        console.log(error.toString());
    }
}
function startwebsocket_callback(cid){
    // get updated information about our callback
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/unified_callback/' + cid);
    ws.onmessage = function(event){
        if (event.data !== ""){
            let data = JSON.parse(event.data);
            //console.log("got new message through websocket: " + event.data);
            if(data['channel'] === "updatedcallback"){
                Vue.set(callback_table.callbacks, data['id'], Object.assign({}, callback_table.callbacks[data['id']], data));
                if(document.title !== data['description']){document.title = data['description'];}
                data['type'] = 'callback';
                if(params_table.payloadonhost.hasOwnProperty(data['host'])){
                    for(let i = 0; i < params_table.payloadonhost[data['host']].length; i++){
                        if(params_table.payloadonhost[data['host']][i]['id'] === data['id']){
                            Vue.set(params_table.payloadonhost[data['host']], i, data);
                            //params_table.payloadonhost[rsp['host']][i] = rsp;
                            params_table.$forceUpdate();
                            return;
                        }
                    }
                }else{
                    //something went wrong, but still add it
                    params_table.payloadonhost[data['host']] = [data];
                }
            }else if(data['channel'].includes("task")){
                add_new_task(data);
            }else if(data['channel'].includes("response")){
                add_new_response(data, true);
            }else{
                console.log("Unknown message from server: " + event.data);
            }
        }
    };
    ws.onclose = function(){
		wsonclose();
	};
	ws.onerror = function(){
        wsonerror();
	};
}
function add_comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
    if(data['status'] !== 'success'){
        alertTop("danger", data['error']);
    }
}
function remove_comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
    if(data['status'] !== 'success'){
        alertTop("danger", data['error']);
    }
}
function persist_transform_active_status_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
    if(data['status'] !== 'success'){
        alertTop("danger", data['error']);
    }
}

var command_params = [];
var params_table = new Vue({
    el: '#paramsModal',
    data: {
        command_params,
        credentials: [],
        cmd: {},
        payloads: [],
        payloadonhost: {},
    },
    methods:{
        command_params_add_array_element: function(param){
            param.array_value.push('');
        },
        command_params_remove_array_element: function(param, index){
            param.array_value.splice(index, 1);
        },
        select_main_credential: function(param){
            for(let i = 0; i < params_table.credentials.length; i++){
                if(params_table.credentials[i].id === param.credential_id){
                    let options = {"domain":params_table.credentials[i].domain,
                    "username": params_table.credentials[i].user,
                    "credential": params_table.credentials[i].credential.substring(0, 70)}
                    param.credential = options;
                }
            }
        },
        select_specific_payload_on_host: function(param){
            if(param.agentconnect_host !== ""){
                param.payloads = params_table.payloadonhost[param.agentconnect_host];
                param.agentconnect_c2profile = -1;
                param.c2profiles = [];
            }else{
                param.payloads = [];
                param.c2profiles = [];
                param.agentconnect_c2profile = -1;
                param.agentconnect_payload = "";
            }
            params_table.$forceUpdate();
        },
        select_specific_c2profile_in_agent: function(param){
            if(params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload] !== undefined){
                param.c2profiles = params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload]['supported_profiles'];
                param.agentconnect_c2profile = -1;
            }else{
                param.c2profiles = [];
                param.agentconnect_c2profile = -1;
            }
        },
        is_linkable: function(param){
            //determine if the c2 profile choice should be disabled or not

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
function post_task_callback_func(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
        if(data.hasOwnProperty('cmd')){
            callback_table.callbacks[data['callback']]['input_field'] = data['cmd'] + " " + data['params'];
        }
    }
}

function startwebsocket_commands(){
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/all_command_info');
    ws.onmessage = function(event){
        if (event.data !== ""){
            let data = JSON.parse(event.data);
            // first determine if we're dealing with command, parameter, or transform
            if(data['notify'].includes("parameters")){
                // we're dealing with new/update/delete for a command parameter
                for(let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                    if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']){
                        // now we need to do something with a param in task_data.ptype_cmd_params[data['payload_type']][i]['params']
                        if(data['notify'] === "newcommandparameters"){
                            // we got a new parameter, so just push it
                            task_data.ptype_cmd_params[data['payload_type']][i]['params'].push(data);
                            return;
                        }
                        for(let j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['params'].length; j++){
                            // now we're either updating or deleting, so we need to find that param
                            if(data['name'] === task_data.ptype_cmd_params[data['payload_type']][i]['params'][j]['name']){
                                if(data['notify'] === "deletedcommandparameters"){
                                    // now we found the parameter to remove
                                    task_data.ptype_cmd_params[data['payload_type']][i]['params'].splice(j, 1);
                                    return;
                                }
                                else{
                                    // we're editing the parameter and found the one to edit
                                    Vue.set(task_data.ptype_cmd_params[data['payload_type']][i]['params'], j, data);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            else if(data['notify'].includes("transform")){
                // we're dealing with new/update/delete for a command transform
                for(let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                    if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['command'] || task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']){
                        // now we need to do something with a transform in task_data.ptype_cmd_params[data['payload_type']][i]['transforms']
                        if(data['notify'] === "newcommandtransform"){
                            // we got a new transform, so just push it
                            task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].push(data);
                            return;
                        }
                        for(let j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].length; j++){
                            if(data['id'] === task_data.ptype_cmd_params[data['payload_type']][i]['transforms'][j]['id']){
                                // now we're either updating or deleting
                                if(data['notify'] === "deletedcommandtransform"){
                                    task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].splice(j, 1);
                                }
                                else{
                                    // we're editing the parameter not deleting it
                                    Vue.set(task_data.ptype_cmd_params[data['payload_type']][i]['transforms'], j, data);
                                }
                            }
                        }
                        return;
                    }
                }
            }
            else{
                // we're dealing with new/update/delete for a command
                if(data['notify'] === "newcommand"){
                    data['params'] = [];
                    data['transforms'] = [];
                    task_data.ptype_cmd_params[data['payload_type']].push(data);
                }
                else if(data['notify'] === "deletedcommand"){
                    // we don't get 'payload_type' like normal, instead, we get payload_type_id which doesn't help
                    for (const [key, value] of Object.entries(task_data.ptype_cmd_params)) {
                      for(let i = 0; i < value.length; i++){
                        if(value[i]['id'] === data['id']){
                            // we found the value to remove
                            task_data.ptype_cmd_params[key].splice(i, 1);
                            return;
                        }
                      }
                    }
                }
                else{
                    for(let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                        if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']){
                            Vue.set(task_data.ptype_cmd_params[data['payload_type']], i, Object.assign({}, task_data.ptype_cmd_params[data['payload_type']][i], data));
                        }
                    }
                }
            }

        }
    };
    ws.onclose = function(){
		wsonclose();
	};
	ws.onerror = function(){
        wsonerror();
	};
}
startwebsocket_commands();
function startwebsocket_parameter_hints(){
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/parameter_hints/current_operation');
    ws.onmessage = function(event){
        if(event.data !== ""){
            //console.log(event.data);
            try{
                let data = JSON.parse(event.data);
                if(data['channel'] === 'newpayload'){
                    let payload_list_selection = "";
                    if(data['tag'].includes("Autogenerated from task")){return;}
                    data['location'] = data.location.split("/").slice(-1)[0];
                    payload_list_selection += data.location + " - ";
                    let profiles = new Set();
                    for(let i = 0; i < data.supported_profiles.length; i++){
                        profiles.add(data.supported_profiles[i]['name']);
                    }
                    payload_list_selection += Array.from(profiles);
                    payload_list_selection += " - " + data.tag;
                    if(payload_list_selection.length > 90){
                        payload_list_selection = payload_list_selection.substring(0, 90) + "...";
                    }
                    data['payload_list_selection'] = payload_list_selection;
                    params_table.payloads.push(data);
                }else if(data['channel'] === 'updatedpayload'){
                    if(data['tag'].includes("Autogenerated from task")){return;}
                    for(let i = 0; i < params_table.payloads.length; i++){
                        if(params_table.payloads[i]['id'] === data['id']){
                            if(data['deleted'] === true){
                                params_table.payloads.splice(i, 1);
                                return;
                            }
                            let payload_list_selection = "";
                            data['location'] = data.location.split("/").slice(-1)[0];
                            payload_list_selection += data.location + " - ";
                            let profiles = new Set();
                            for(let i = 0; i < data.supported_profiles.length; i++){
                                profiles.add(data.supported_profiles[i]['name']);
                            }
                            payload_list_selection += Array.from(profiles);
                            //payload_list_selection += profiles.values().toString();
                            payload_list_selection += " - " + data.payload_type + " - " + data.tag;
                            data['payload_list_selection'] = payload_list_selection;
                            params_table.payloads[i] = data;
                            break;
                        }
                    }
                }else if(data['channel'] === 'newcredential'){
                    params_table.credentials.push(data);
                }else if(data['channel'] === 'updatedcredential'){
                    for(let i = 0; i < params_table.credentials.length; i++){
                        if(params_table.credentials[i]['id'] === data['id']){
                            if(data['deleted'] === true){
                                params_table.credentials.splice(i, 1);
                                return;
                            }
                            params_table.credentials[i] = data;
                            break;
                        }
                    }
                }else if(data['channel'] === 'newpayloadonhost'){
                    //console.log(data);
                    data['type'] = 'payload';
                    if(params_table.payloadonhost.hasOwnProperty(data['host'])){
                        Vue.set(params_table.payloadonhost[data['host']], params_table.payloadonhost[data['host']].length + 1, data);
                        //params_table.payloadonhost[data['host']].push(data);
                    }else{
                        Vue.set(params_table.payloadonhost,data['host'], [data]);
                        //params_table.payloadonhost[data['host']] = [data];
                    }

                }else if(data['channel'] === 'updatedpayloadonhost'){
                    //console.log(data);
                    data['type'] = 'payload';
                    for(let i = 0; i < params_table.payloadonhost[data['host']].length; i++){
                        if(params_table.payloadonhost[data['host']][i]['id'] === data['id']){
                            if(data['deleted'] === true){
                                params_table.payloadonhost[data['host']].splice(i, 1);
                                return;
                            }
                            Vue.set(params_table.payloadonhost[data['host']], i , data);
                            //params_table.payloadonhost[data['host']][i] = data;
                            break;
                        }
                    }
                }
                params_table.$forceUpdate();
            }catch(error){
                console.log(error.toString());
            }
        }
    };
    ws.onclose = function () {
        wsonclose();
    };
    ws.onerror = function () {
        wsonerror();
    };
}startwebsocket_parameter_hints();
function updateClocks(){
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    for(let key in callback_table.callbacks){
        // update each 'last_checkin' time to be now - that value
        checkin_time = new Date(callback_table.callbacks[key]['last_checkin']);
        callback_table.callbacks[key]['real_time'] = timeConversion(now - checkin_time);
    }
}
function timeConversion(millisec){
    let output = "";
    let seconds = Math.trunc(((millisec / 1000)) % 60);
    let minutes = Math.trunc(((millisec / (1000 * 60))) % 60);
    let hours = Math.trunc(((millisec / (1000 * 60 * 60))) % 24);
    let days = Math.trunc(((millisec / (1000 * 60 * 60 * 24))) % 365);
    if(days > 1){ output = output + days + " Days ";}
    else if(days > 0){output = output + days + " Day ";}
    if(hours > 1){ output = output + hours + " Hours ";}
    else if(hours > 0){output = output + hours + " Hour ";}
    if(minutes > 1){ output = output + minutes + " Minutes ";}
    else if(minutes > 0){output = output + minutes + " Minute ";}
    if(seconds > 1){ output = output + seconds + " Seconds ";}
    else if(seconds > 0){ output = output + seconds + " Second ";}
    return output;
    //return days + ":" + hours + ":" + minutes + ":" + seconds;
}
setInterval(updateClocks, 50);

//autocomplete function taken from w3schools: https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  //console.log(inp);
  try{
        //console.log("removing listeners for: " + inp.id);
        inp.removeEventListener("input", autocomplete_input_EventListener_function);
        inp.removeEventListener("keydown", autocomplete_keyup_EventListener_function);
        //console.log("removed listeners for: " + inp.id);
    }
    catch(error){
        //ok, no events to remove
        console.log(error.toString());
    }
    inp.addEventListener("input", autocomplete_input_EventListener_function);
    inp.addEventListener("keydown", autocomplete_keyup_EventListener_function);
  //inp.addEventListener("input", function(e) {});
  /*execute a function presses a key on the keyboard:*/
  //inp.addEventListener("keyup", function(e) {});
  function autocomplete_input_EventListener_function(e){
    let a, b, i;
      //console.log(this.id);
      callback_id = this.id.split(":")[2];
      //var val = inp.value;
      let val = callback_table.callbacks[callback_id]['input_field'];
      closeAllLists();
      if(!val || val === ""){return false;}
      var longest = 0;
      /*close any already open lists of autocompleted values*/

      currentFocus = -1;
      /*create a DIV element that will contain the items (values):*/
      a = document.createElement("DIV");
      a.setAttribute("id", callback_id + "autocomplete-list");
      a.setAttribute("class", "autocomplete-items");
      a.setAttribute("style", "max-height:calc(40vh);overflow-y:scroll");
      /*append the DIV element as a child of the autocomplete container:*/
      this.parentNode.appendChild(a);
      /*for each item in the array...*/
      for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
          if( arr[i].toUpperCase().includes(val.toUpperCase())){
          /*create a DIV element for each matching element:*/
          if(arr[i].length > longest){ longest = arr[i].length;}
          b = document.createElement("DIV");
          /*make the matching letters bold:*/
          let start = arr[i].toUpperCase().indexOf(val.toUpperCase());
          b.innerHTML = arr[i].substr(0, start);
          b.innerHTML += "<strong><span class='matching'>" + arr[i].substr(start, val.length) + "</span></strong>";
          b.innerHTML += arr[i].substr(val.length + start);
          /*insert a input field that will hold the current array item's value:*/
          b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
          /*execute a function when someone clicks on the item value (DIV element):*/
          b.addEventListener("click", function(e) {
              /*insert the value for the autocomplete text field:*/
              //inp.value = inp.getElementsByTagName("input")[0].value;
              callback_table.callbacks[callback_id]['input_field'] = this.getElementsByTagName("input")[0].value;
              /*close the list of autocompleted values,
              (or any other open lists of autocompleted values:*/
              closeAllLists();
          });
          a.appendChild(b);
        }
        a.style.width = longest + 2 + "em";
      }
    }
    function autocomplete_keyup_EventListener_function(e){
        let callback_id = this.id.split(":")[2];
          let x = document.getElementById(callback_id + "autocomplete-list");
          if (x) x = x.getElementsByTagName("div");
          //console.log(e.keyCode);
          if (e.keyCode === 9) {
          try {
              //we want to close the autocomplete menu and fill in with the top-most element
              if(currentFocus === -1){
                  callback_table.callbacks[callback_id]['input_field'] = x[0].textContent;
              }else{
                  callback_table.callbacks[callback_id]['input_field'] = x[currentFocus].textContent;
              }
              e.preventDefault();
              closeAllLists("");
          }catch(error){
              //there must not be any autocomplete stuff, so just let it go on
          }
      } else if(e.keyCode === 38 && x !== null){
          //keycode UP arrow
          if(x.length > 0){
              e.stopImmediatePropagation();
              currentFocus--;
              addActive(x, callback_id);
          }
      } else if(e.keyCode === 40 && x !== null){
          //keycode DOWN arrow
          if(x.length > 0){
              e.stopImmediatePropagation();
              currentFocus++;
              addActive(x, callback_id);

          }
      } else if(e.keyCode === 27 && x !== null){
          closeAllLists();
      } else if(e.keyCode === 13 && x !== null && x.length > 0){
          if(currentFocus < 0){
              //console.log(x);
              callback_table.callbacks[callback_id]['input_field'] = x[0].textContent;
              e.preventDefault();
              closeAllLists("");
              e.stopImmediatePropagation();
          }else{
              callback_table.callbacks[callback_id]['input_field'] = x[currentFocus].textContent;
              e.preventDefault();
              closeAllLists("");
              e.stopImmediatePropagation();
          }
      }
    }
    function addActive(x, callback_id) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        if(x[currentFocus] !== undefined) {
            x[currentFocus].classList.add("autocomplete-active");
            //inp.value = x[currentFocus].getElementsByTagName("input")[0].value;
            //console.log(x[currentFocus].getElementsByTagName("input")[0].value);
            callback_table.callbacks[callback_id]['input_field'] = x[currentFocus].getElementsByTagName("input")[0].value;
        }

      }
      function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (let i = 0; i < x.length; i++) {
          x[i].classList.remove("autocomplete-active");
        }
      }
      function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        let x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
          if (elmnt !== x[i] && elmnt !== inp) {
            x[i].parentNode.removeChild(x[i]);
          }
        }
      }
      /*execute a function when someone clicks in the document:*/
      document.addEventListener("click", function (e) {
          closeAllLists(e.target);
      });
}


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