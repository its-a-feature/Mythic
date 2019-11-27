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
        filter: "",
        sort: "id",
        direction: 1
    },
    methods: {
        deselect_all_but_callback: function(callback){
            Object.keys(task_data.meta).forEach(function(key){
                Vue.set(task_data.meta[key], 'selected', false);
            });
            Object.keys(this.callbacks).forEach(function(key){
                Vue.set(callbacks[key], 'selected', false);
            });
            Vue.set(task_data.meta[callback.id], 'selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);

            task_data.input_field_placeholder['data'] = callback.user + "@" + callback.host + "(Callback:" + callback.id + ")";
            task_data.input_field_placeholder['cid'] = callback.id;
        },
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
            //make sure we save that this tab was selected for later
            add_to_storage("tasks", callback.id);
            //get the data from teh background process (all_tasks) into the bottom tab that's being loaded (task_data.meta)
            Vue.set(task_data.meta[callback.id], 'data', all_tasks[callback.id] );
            this.deselect_all_but_callback(callback);
            Vue.set(task_data.meta[callback.id], 'tasks', true);
            task_data.meta[callback.id]['display'] = callback.user + "@" + callback.host + "(Callback: " + callback.id + ")";
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#tasks' + callback.id.toString() + 'tab').click();
            }, 0);

            //set the autocomplete for the input field
            let autocomplete_commands = [];
            for(let i = 0; i < task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']].length; i++){
                autocomplete_commands.push(task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i].cmd );
            }
            autocomplete(document.getElementById("commandline"), autocomplete_commands );
            meta[callback.id]['badges'] = 0;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'] + "/all_tasking",get_all_tasking_callback,"GET",null);
        },
        edit_description: function(callback){
            $( '#editDescriptionText' ).val(callback.description);
            $( '#editDescriptionModal' ).modal('show');
            $('#editDescriptionModal').on('shown.bs.modal', function () {
                $('#editDescriptionText').focus();
                $("#editDescriptionText").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13) {
                        $( '#editDescriptionSubmit' ).click();
                    }
                });
            });
            $( '#editDescriptionSubmit' ).unbind('click').click(function(){
                let newDescription = $( '#editDescriptionText' ).val();
                if(newDescription !== callback.description){
                    //only bother sending the update request if the description is actually different
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],edit_description_callback,"PUT", {"description": newDescription});
                }
            });
        },
        exit_callback: function(callback){
            //task the callback to exit on the host
            for(let i = 0; i < task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']].length; i++) {
                if (task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i]['is_exit']) {
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + callback['id'], null, "POST", {
                        "command": task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i].cmd,
                        "params": "",
                        'transform_status': {}
                    });
                }
            }
        },
        remove_callback: function(callback){
            if(meta[callback.id]['selected']){
                move('left', true);
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'],null,"PUT", {"active":"false"});
            stop_getting_callback_updates(callback.id, true);
        },
        show_screencaptures: function(callback){
            Vue.set(meta[callback.id], 'screencaptures', true);
            this.deselect_all_but_callback(callback);
            add_to_storage("screencaptures", callback.id);
            Vue.set(task_data.meta[callback.id], 'selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/bycallback/" + callback['id'],view_callback_screenshots,"GET");
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#screencaptures' + callback.id.toString() + 'tab').click();
            }, 0);
        },
        show_keylogs: function(callback){
            Vue.set(meta[callback.id], 'keylogs', true);
            add_to_storage("keylogs", callback.id);
            this.deselect_all_but_callback(callback);
            Vue.set(task_data.meta[callback.id], 'selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/callback/" + callback['id'],view_callback_keylogs,"GET");
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#keylogs' + callback.id.toString() + 'tab').click();
            }, 0);
        },
        show_process_list: function(callback){
            Vue.set(meta[callback.id], 'process_list', true);
            Vue.set(meta[callback.id], 'host', callback.host);
            add_to_storage("process_list", callback.id);
            this.deselect_all_but_callback(callback);
            Vue.set(task_data.meta[callback.id], 'selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/-1/" + btoa(callback.host) ,function(response){
                try{
                    //console.log(response);
                    let data = JSON.parse(response);
                    if(data['status'] === "success" && Object.keys(data['process_list']).length !== 0){
                        //console.log(data);
                        try {
                            data['process_list']['process_list'] = JSON.parse(data['process_list']['process_list']);
                            //console.log(data['process_list']['process_list']);
                        }catch(error){
                            alertTop("warning", "Failed to parse process list: " + error.toString());
                            data['process_list']['process_list'] = [];
                        }
                        Vue.set(meta[callback.id], 'process_list_data', data['process_list']);
                        Vue.set(meta[callback.id], 'process_list_tree', data['tree_list']);
                        //console.log(meta[callback.id]);
                    }
                    else if(data['status'] === "error"){
                        alertTop("danger", data['error']);
                    }
                    else{
                        Vue.set(meta[callback.id], 'process_list_data', {
                            "callback": callback.id,
                            "host": callback.host,
                            "process_list": [],
                            "task": "",
                            "timestamp": ""
                        });
                        Vue.set(meta[callback.id], 'process_list_tree', {});
                    }
                    startwebsocket_processlist(callback.id);
                    task_data.$forceUpdate();
                }catch(error){
                    //console.log(error);
                    alertTop("danger", "session expired, refresh please");
                }
            },"GET");
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#process_list' + callback.id.toString() + 'tab').click();
            }, 0);
        },
        view_loaded_commands: function(callback){
            //display all of the loaded commands and their versions for the selected callback
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'] + "/loaded_commands",view_loaded_commands_callback,"GET");
        },
        check_all_callbacks:function(){
            for(let i in this.callbacks){
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
                let pieces = this.filter.split(":");
                if(callback.hasOwnProperty(pieces[0])){
                    if(callback[pieces[0]].toString().includes(pieces[1])){
                        return true;
                    }
                    return false;
                }
                return callback.active;
            }
            return callback.active;
        },
        sort_callbacks: function(column){
            //if column == current sort, reverse direction
            if(column === this.sort) {
              this.direction = this.direction * -1;
            }
            this.sort = column;
        },
        hide_selected: function(){
            let selected_list = [];
            for(let i in this.callbacks){
                if(this.callbacks[i]['selected']){
                    selected_list.push(this.callbacks[i]['id']);
                }
            }
            group_modify.callbacks = selected_list;
            $('#group_modify').modal('show');
            $('#group_modify_submit').unbind('click').click(function() {
                for(let i in selected_list){
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + selected_list[i],null,"PUT", {"active":"false"});
                    stop_getting_callback_updates(selected_list[i], true);
                }
                group_modify.callbacks = [];
            });
        },
        exit_selected: function(){
            let selected_list = [];
            for(let i in this.callbacks){
                if(this.callbacks[i]['selected']){
                    selected_list.push(this.callbacks[i]['id']);
                }
            }
            group_modify.callbacks = selected_list;
            $('#group_modify').modal('show');
            $('#group_modify_submit').unbind('click').click(function() {
                for(let i in selected_list){
                    for(let j = 0; j < task_data.ptype_cmd_params[callbacks[selected_list[i]]['payload_type']].length; j++){
                       if(task_data.ptype_cmd_params[callbacks[selected_list[i]]['payload_type']][j]['is_exit']){
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + selected_list[i], null, "POST", {"command":task_data.ptype_cmd_params[callbacks[selected_list[i]]['payload_type']][j].cmd,"params":"", 'transform_status':{}});
                       }
                    }
                }
                group_modify.callbacks = [];
            });
        }
    },
    computed:{
        sorted_callbacks:function() {
          return Object.values(this.callbacks).sort((a,b) => {
              let modifier = this.direction;
              if(a[this.sort] < b[this.sort]){ return -1 * modifier; }
              else if(a[this.sort] > b[this.sort]){ return 1 * modifier; }
              else {return 0;}
            });
        },
        multiple_selected:function(){
            let multiple_selected = 0;
            for(let i  in  this.callbacks){
                if(this.callbacks[i]['selected']){
                    multiple_selected++;
                }
            }
            return multiple_selected > 1;
        },
    },
    delimiters: ['[[',']]']
});
var group_modify = new Vue({
    el: '#group_modify',
    delimiters: ['[[',']]'],
    data: {
        callbacks: []
    }
});
function toggle_lock_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] === 'success'){
        //console.log(data);
        alertTop("success", "Successfully updated", 1);
    }else{
        alertTop("warning", data['error']);
    }
}
function get_all_tasking_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] === 'success'){
        //this has [callback_info, "tasks": [ {task_info, "responses": [ {response_info} ] } ] ]
        for(let i = 0; i < data['tasks'].length; i++){
            //want to indicate if we've fetched
            data['tasks'][i]['expanded'] = false;
            add_new_task(data['tasks'][i]);
            //for(let j = 0; j < data['tasks'][i]['responses'].length; j++){
            //    add_new_response(data['tasks'][i]['responses'][j], false);  //the false indicates to start collapsed
            //}
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
    if(data['status'] === 'success'){
        loadedCommandModal.loaded_commands = data['loaded_commands'];
        $( '#loadedCommandModal' ).modal('show');
    }
    else{
        alertTop("danger", data['error']);
    }
}
function stop_getting_callback_updates(id, remove_from_view){
    //make sure we stop getting updates from the websockets
    try{
        if(remove_from_view){remove_callback_from_view(id);}
        remove_from_storage("tasks", id);
        remove_from_storage("screencaptures", id);
        remove_from_storage("keylogs", id);
        remove_from_storage("process_list", id);
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
    if(data['status'] !== 'success'){
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
            let autocomplete_list = document.getElementById('commandlineautocomplete-list');
            if( autocomplete_list !== null && autocomplete_list.hasChildNodes()){
                return;
            }
            let task = this.input_field.trim().split(" ");
            let command = task[0].trim();
            let params = "";
            if (task.length > 1){
                params = task.slice(1, ).join(' '); //join index 1 to the end back into a string of params
            }
            // first check to see if we have any information about this payload time to leverage
            if(this.ptype_cmd_params.hasOwnProperty(callbacks[data['cid']]['payload_type'])){
                //now loop through all of the commands we have to see if any of them match what was typed
                for(let i = 0; i < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']].length; i++){
                    //special category of trying to do a local help
                    if(command === "help"){
                        if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] === params){
                            alertTop("info", "<b>Usage: </b>" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['help_cmd'] +
                            "<br><b>Description:</b>" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['description'],0);
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
                            let set_value = task.slice(2, ).join(' ');
                            if(task[1] === "parent"){
                                set_value = parseInt(set_value);
                            }
                            let set_data = {};
                            set_data[task[1]] = set_value;
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + this.input_field_placeholder['cid'],
                            function(response){
                                try{
                                    var rdata = JSON.parse(response);
                                }catch(error){
                                    alertTop("danger", "Session expired, please refresh");
                                    return;
                                }
                                if(rdata['status'] === 'success'){
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
                    else if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] === command){
                        let transform_status = {};
                        for(let j = 0; j < ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['transforms'].length; j++){
                            transform_status[ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['transforms'][j]['order']] = ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['transforms'][j]['active'];
                        }
                        // if they didn't type any parameters, but we have some registered for this command, display a GUI for them
                        if(params.length === 0 && this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length !== 0){
                            //if somebody specified command arguments on the commandline without going through the GUI, by all means, let them
                            //  This is for if they want the GUI to auto populate for them
                            //  Also make sure that there are actually parameters for them to fill out
                            params_table.command_params = [];
                            //check if this user has typed this command before, if so, auto populate with those old values to help out
                            let last_vals = undefined;
                            for(let j = meta[data['cid']]['history'].length - 1; j >= 0 && last_vals === undefined; j--){
                                // just look back through  the current callback and only look for this user
                                if(meta[data['cid']]['history'][j]['command'] === command){
                                    if(meta[data['cid']]['history'][j]['operator'] === "{{name}}"){
                                        try {
                                            last_vals = JSON.parse(meta[data['cid']]['history'][j]['params']);
                                        }catch(error){
                                            console.log(error.toString());
                                            last_vals = {};
                                        }
                                        break;
                                    }
                                }
                            }
                            if(last_vals === undefined){last_vals = {}}
                            for(let j = 0; j < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length; j++){
                                let blank_vals = {"string_value": "", "credential_value":"", "credential_id": 0, "number_value": -1, "choice_value": "", "choicemultiple_value": [], "boolean_value": false, "array_value": []};

                                let param = Object.assign({}, blank_vals, this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'][j]);
                                if(param.choices.length > 0){param.choice_value = param.choices.split("\n")[0];}
                                param.string_value = param.hint;
                                //console.log(param);
                                if(last_vals.hasOwnProperty(param.name)){
                                    //lets set the appropriate param value to the old value
                                    switch(param.type){
                                        case "String":{
                                            param['string_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Credential":{
                                            console.log(last_vals);
                                            break;
                                        }
                                        case "Number":{
                                            param['number_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Choice":{
                                            param['choice_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "ChoiceMultiple":{
                                            param['choicemultiple_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Boolean":{
                                            param['boolean_value']  = last_vals[param.name];
                                            break;
                                        }
                                        case "Array":{
                                            param['array_value'] = last_vals[param.name];
                                            break;
                                        }
                                    }
                                }
                                params_table.command_params.push(param);
                            }
                            $( '#paramsModalHeader' ).text(command + "'s Parameters");
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
                                    }
                                }
                                uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func,file_data,
                                    {"command":command,"params": JSON.stringify(param_data), "test_command": task_data.test_command, "transform_status": transform_status});
                                //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                                task_data.input_field = "";
                            });

                        }
                        else{
                            //somebody knows what they're doing or a command just doesn't have parameters, send it off
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST",
                        {"command":command,"params":params, "test_command": task_data.test_command, "transform_status": transform_status});

                            //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                            task_data.input_field = "";
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
                    //don't bother alerting for them just accidentally hitting enter
                    if(command !== ""){
                        alertTop("warning", "Unknown command: " + command, 2);
                    }
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
            Vue.set(metadata, 'badges', 0);
            Vue.set(callback_table.callbacks[metadata['id']], 'selected', true);
            //set the autocomplete for the input field
            let autocomplete_commands = [];
            for(let i = 0; i < this.ptype_cmd_params[callbacks[metadata.id]['payload_type']].length; i++){
                autocomplete_commands.push(this.ptype_cmd_params[callbacks[metadata.id]['payload_type']][i].cmd );
            }
            autocomplete(document.getElementById("commandline"), autocomplete_commands );
            Vue.nextTick().then(function(){
                $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
            });
        },
        toggle_image: function(image){
            let panel = document.getElementById(image.remote_path).nextElementSibling;
            if (panel.style.display === "") {
                panel.style.display = "none";
            } else {
                panel.style.display = "";
            }
        },
        toggle_arrow: function(taskid){
            $('#cardbody' + taskid).unbind('shown.bs.collapse').on('shown.bs.collapse', function(){
                get_all_responses(taskid);
                $('#color-arrow' + taskid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + taskid).unbind('hidden.bs.collapse').on('hidden.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(0deg)");
            });
        },
        console_tab_close: function(metadata){
            if(meta[metadata.id]['selected']){
                move('left', true);
            }
            setTimeout(()=>{
                meta[metadata.id]['tasks'] = false;
                remove_from_storage("tasks", metadata.id);
                stop_getting_callback_updates(metadata.id, false);

            }, 0);
            event.stopPropagation();
        },
        screencaptures_tab_close: function(metadata){
            if(meta[metadata.id]['selected']){
                move('left',true);
            }
            setTimeout(()=>{
                meta[metadata.id]['screencaptures'] = false;
                remove_from_storage("screencaptures", metadata.id);
            }, 0);
            event.stopPropagation();
        },
        keylog_tab_close: function(metadata){
            if(meta[metadata.id]['selected']){
                move('left', true);
            }
            setTimeout(()=> {
                meta[metadata.id]['keylogs'] = false;
                remove_from_storage("keylogs", metadata.id);
            }, 0);
            event.stopPropagation();
        },
        process_list_tab_close: function(metadata){
            if(meta[metadata.id]['selected']){
                move('left', true);
            }
            setTimeout(()=> {
                meta[metadata.id]['process_list'] = false;
                remove_from_storage("process_list", metadata.id);
            }, 0);
            event.stopPropagation();
        },
        task_list_processes: function(metadata){
            let tasked = false;
            this.ptype_cmd_params[callbacks[metadata.id]['payload_type']].forEach(function(x){
                if(x['is_process_list'] === true){
                    //console.log(x);
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + metadata.id,post_task_callback_func, "POST", {"command":x['cmd'],"params":x['process_list_parameters'], "test_command": false, "transform_status": {}});
                    alertTop("info", "Tasked Callback " + metadata.id + " to list processes", 2);
                    tasked = true;
                }
            });
            if(!tasked){
                alertTop("warning", "Failed to find associated command for " + callbacks[metadata.id]['payload_type'] + " to list processes", 2);
            }
        },
        get_previous_process_list: function(metadata){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/search/", function(response){
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        //console.log(data);
                        try {
                            data['process_list']['process_list'] = JSON.parse(data['process_list']['process_list']);

                        }catch(error){
                            //console.log(error);
                            alertTop("warning", "Failed to parse process list: " + error.toString());
                            data['process_list']['process_list'] = [];
                        }

                        data['process_list']['diff'] = false;
                        Vue.set(metadata, 'process_list_data', data['process_list']);
                        Vue.set(metadata, 'process_list_tree', data['tree_list']);
                        task_data.$forceUpdate();
                    }else{
                        alertTop("warning", data['error'], 4);
                    }
                }catch(error){
                    console.log(error);
                    alertTop("danger", "session expired, refresh");
                }
            }, "POST", {"host": metadata['process_list_data']['host'], "pid": metadata['process_list_data']['id'], "adjacent": "prev"});
        },
        get_next_process_list: function(metadata){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/search/", function(response){
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        //console.log(data);
                        try {
                            data['process_list']['process_list'] = JSON.parse(data['process_list']['process_list']);

                        }catch(error){
                            alertTop("warning", "Failed to parse process list: " + error.toString());
                            data['process_list']['process_list'] = [];
                        }

                        data['process_list']['diff'] = false;
                        Vue.set(metadata, 'process_list_data', data['process_list']);
                        Vue.set(metadata, 'process_list_tree', data['tree_list']);
                        task_data.$forceUpdate();
                    }else{
                        alertTop("warning", data['error'], 4);
                    }
                }catch(error){
                    alertTop("danger", "session expired, refresh");
                }
            }, "POST", {"host": metadata['process_list_data']['host'], "pid": metadata['process_list_data']['id'], "adjacent": "next"});
        },
        diff_process_list: function(metadata){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/search/", function(response){
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        //console.log(data);
                        try {
                            data['process_list']['process_list'] = JSON.parse(data['process_list']['process_list']);
                            //metadata['process_list_data']['process_list'] is the current process list
                            //data['process_list']['process_list'] is the previous process list
                            // want to set the current process list to the diff of the two
                            latest = metadata['process_list_data']['process_list'];
                            data['process_list']['process_list'].forEach(function (x) {
                                match = latest.findIndex(function (l) {
                                    return (x['pid'] === l['pid']) &&
                                        (x['name'] === l['name']) && (x['ppid'] === l['ppid']) &&
                                        (x['bin_path'] === l['bin_path']) && (x['user'] === l['user']);
                                });
                                if (match === -1) {
                                    //old process isn't in the latest process, mark as removed
                                    x['diff'] = 'remove';
                                } else {
                                    //we did find it, mark it as the same and remove it from latest
                                    x['diff'] = 'same';
                                    latest.splice(match, 1);
                                }
                            });
                            //latest should now include all elements that are new
                            latest.forEach(function (x) {
                                x['diff'] = 'add';
                                data['process_list']['process_list'].push(x);
                            });
                            Vue.set(metadata['process_list_data'], 'process_list', data['process_list']['process_list']);
                            Vue.set(metadata['process_list_data'], 'diff', true);
                        }catch(error){
                            alertTop("warning", "Failed to parse process list: " + error.toString());
                        }
                    }else{
                        alertTop("warning", data['error'], 4);
                    }
                }catch(error){
                    alertTop("danger", "session expired, refresh");
                }
            }, "POST", {"host": metadata['process_list_data']['host'], "pid": metadata['process_list_data']['id'], "adjacent": "prev"});
        },
        apply_process_filter: function(proc, metadata){
            if(metadata.process_list_filter.includes(":")){
                pieces = metadata.process_list_filter.split(":");
                if(proc.hasOwnProperty(pieces[0])){
                    if(proc[pieces[0]].toString().includes(pieces[1])){
                        return true;
                    }
                    return false;
                }
                return true;
            }
            return true;
        },
        toggle_keylog_times: function(metadata){
            Vue.set(metadata, 'keylog_time', !metadata['keylog_time']);
            task_data.$forceUpdate();
        },
        cmd_history_up: function(placeholder_data){
            //check and see if there are any auto-complete windows open, if so, don't do this
            if( $('.autocomplete-items').children().length > 0){return;}
            let cid = this.input_field_placeholder['cid'];
            if(meta[cid] !== undefined) {
                meta[cid]['history_index'] -= 1;
                if (meta[cid]['history_index'] < 0) {
                    meta[cid]['history_index'] = 0;
                }
                let index = meta[cid]['history_index'];
                this.input_field = meta[cid]['history'][index]['command'] + " " + meta[cid]['history'][index]['params'];
            }

        },
        cmd_history_down: function(placeholder_data){
            //check and see if there are any auto-complete windows open, if so, don't do this
            if( $('.autocomplete-items').children().length > 0){return;}
            let cid = this.input_field_placeholder['cid'];
            if(meta[cid] !== undefined) {
                meta[cid]['history_index'] += 1;
                if (meta[cid]['history_index'] >= meta[cid]['history'].length) {
                    meta[cid]['history_index'] = meta[cid]['history'].length - 1;
                }
                let index = meta[cid]['history_index'];
                this.input_field = meta[cid]['history'][index]['command'] + " " + meta[cid]['history'][index]['params'];
            }
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
              let el = document.createElement('textarea');
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
              alertTop("info", "Copied...", 1);
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

        }
    },
    computed: {
        hasTransformsSet: function(){
            //returns true or false if the command has transforms set as active
            let cmd = this.input_field.split(" ")[0];
            if(cmd){
                let cid = this.input_field_placeholder['cid'];
                if(cid === -1){return false;}
                for(let i = 0; i < this.ptype_cmd_params[callbacks[cid]['payload_type']].length; i++){
                    if(cmd === this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['cmd']){
                        //we found the right command, now check to see if there are any transform associated that are set to active
                        for(let j = 0; j < this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['transforms'].length; j++){
                            if(this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['transforms'][j]['active'] === true){
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
            let cmd = this.input_field.split(" ")[0];
            let cid = this.input_field_placeholder['cid'];
            if(cmd !== ""){
                for(let i = 0; i < this.ptype_cmd_params[callbacks[cid]['payload_type']].length; i++){
                    if(cmd === this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['cmd']){
                        return i;
                    }
                }
            }
            return -1;
        },
        get_payload_type: function(){
            let cid = this.input_field_placeholder['cid'];
            if(cid !== -1){
                return callbacks[cid]['payload_type'];
            }
            return null;
        },
        taskable: function(){
            let cid = this.input_field_placeholder['cid'];
            if(cid === -1){
                return false;
            }
            if(callbacks[cid]['locked']){
                if(callbacks[cid]['locked_operator'] === "{{username}}"){
                    return true;
                }
            }else{
                return true;
            }
        }
    },
    delimiters: ['[[', ']]'],
});
Vue.component('tree-menu', {
  template: '<div class="tree-menu">\n' +
          '    <div class="label-wrapper" @click="toggleChildren">\n' +
          '      <div :style="indent" :class="labelClasses">\n' +
          '      <font style="filter:brightness(50%)"><template v-for="n in depth">&nbsp;&nbsp;|&nbsp;</template></font>' +
          '        <i v-if="children" class="fa" :class="iconClasses"></i>\n' +
          '        [[process_id]] [[bin_path]]\n' +
          '      </div>\n' +
          '    </div>\n' +
          '    <tree-menu \n' +
          '      v-if="showChildren"\n' +
          '      v-for="node in children" \n' +
          '      :children="node.children" \n' +
          '      :process_id="node.process_id"\n' +
          '      :bin_path="node.name"\n' +
          '      :depth="depth + 1"   \n' +
          '      :callback_pid="callback_pid" \n' +
          '    >\n' +
          '    </tree-menu>\n' +
          '  </div>',
  props: [ 'children', 'process_id', 'depth', 'bin_path', 'callback_pid'],
  data() {
     return {
       showChildren: true
     }
  },
  computed: {
    iconClasses() {
        if( Object.keys(this.children).length === 0){
            return '';
        }else{
            return {
            'far fa-plus': !this.showChildren,
            'far fa-minus': this.showChildren
          }
        }
    },
    labelClasses() {
        let cls = "";
        if(Object.keys(this.children).length > 0){
            cls += 'has-children ';
        }
        if(this.process_id === this.callback_pid){
            cls += "is-callback ";
        }
        return cls;
    },
    indent() {
      //rreturn { transform: `translate(${this.depth * 30}px)`}
    }
  },
  methods: {
    toggleChildren() {
       this.showChildren = !this.showChildren;
    }
  },
    delimiters: ['[[', ']]']
});
function startwebsocket_processlist(cid){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/process_list/' + cid);
    ws.onmessage = function(event){
        if (event.data !== ""){
            let data = JSON.parse(event.data);
            try {
                data['process_list']['process_list'] = JSON.parse(data['process_list']['process_list']);
                //Vue.set(meta[data['callback']], 'process_list_data', data);
                //alertTop("success", "Updated process list on " + data['host']);
            }catch(error){
                alertTop("warning", "Failed to parse process list: " + error.toString());
                data['process_list']['process_list'] = [];
            }
            Object.keys(meta).forEach(function (key) {
                if (meta[key]['process_list'] && callback_table.callbacks[key]['host'] === data['process_list']['host']) {
                    //data['process_list']['process_list'] = [];
                    Vue.set(meta[key], 'process_list_data', data['process_list']);
                    Vue.set(meta[key], 'process_list_tree', data['tree_list']);
                    task_data.$forceUpdate();
                    alertTop("success", "Updated process list on " + data['process_list']['host']);
                }
            });
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
            for(let i = 0; i < params_table.credentials.length; i++){
                if(params_table.credentials[i].id === param.credential_id){
                    let options = {"realm":params_table.credentials[i].realm,
                    "account": params_table.credentials[i].account,
                    "credential": params_table.credentials[i].credential.substring(0, 70)};
                    param.credential = options;
                }
            }

        },
        split_input_params: function(param, index){
            if(param.array_value[index].includes("\n")){
                let pieces = param.array_value[index].split("\n");
                for(let i = 1; i < pieces.length; i++){
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
    if(data['status'] === "success"){
        meta[data['callback']]['images'] = [];
        for(let i = 0; i < data['files'].length; i++){
            let path = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + data['files'][i]['id'];
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
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            //meta[data['callback']]['keylog_data'] = [];
            //console.log(data['keylogs']);
            Vue.set(meta[data['callback']], 'keylog_time', false);
            Vue.set(meta[data['callback']], 'keylog_data', data['keylogs']);
        }
        else{
            alertTop("danger", data['error']);
        }
    }catch(error) {
        alertTop("danger", "session expired, refresh please");
    }
}
function post_task_callback_func(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "session expired, refresh please");
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
        task_data.input_field = data['cmd'] + " " + data['params'];
    }
}
function startwebsocket_callbacks(){
    alertTop("info", "Loading callbacks...", 1);
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data !== ""){
            let cb = JSON.parse(event.data);
            if(!cb['active']){return;}
            add_callback_to_view(cb);
        }
        else{
            if(finished_callbacks === false){
                startwebsocket_commands();
                finished_callbacks = true;
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
function  remove_callback_from_view(id){
    // clear out the data from memory
    task_data.$delete(task_data.meta, id);
    delete all_tasks[id];
    callback_table.$delete(callback_table.callbacks, id);
}
function add_callback_to_view(cb){
    let color = generate_background_color(cb['id']);
    cb['real_time'] = "0:0:0:0";
    cb['bg_color'] = color;
    cb['selected'] = false;
    cb['metadata'] = cb['payload_type'] + "\\" + cb['c2_profile'];
    cb['personal_description'] = "";
    Vue.set(callbacks, cb['id'], cb);
    Vue.set(task_data.meta, cb['id'], {'id': cb['id'],
                                       'tasks': false,
                                       'data':task_data.tasks,
                                       'display': cb['user'] + "@" + cb['host'] + "(Callback: " + cb['id'] + ")",
                                       'screencaptures': false,
                                       'bg_color': color,
                                       'history': [],
                                       'history_index': 0,
                                       'keylogs': false,
                                       'process_list': "",
                                       'process_list_filter': "",
                                       'badges': 0,
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
        if(rsp['active'] === false){
            task_data.meta[rsp.id]['tasks'] = false;
            task_data.meta[rsp.id]['screencaptures'] = false;
            task_data.meta[rsp.id]['keylogs'] = false;
            task_data.meta[rsp.id]['process_list'] = false;
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
    if(data['status'] === "success"){
        delete data['status'];
        if(data['commands'].length > 0){
            data['commands'].push({"cmd": "help", "params":[],"transforms":[], "help_cmd": "help [command]", "description": "get the description and cmd  usage of a command"});
            data['commands'].push({"cmd": "set", "params":[],"transforms":[], "help_cmd": "set keyword value. Keywords are 'parent' and 'description'", "description": "set certain properties of a callback like the parent callback or the description"});
            data['commands'].push({"cmd": "tasks", "params":[],"transforms":[], "help_cmd": "tasks", "description": "query the apfell server for tasks that have been issued but not picked up by the agent in this callback"});
            data['commands'].push({"cmd": "clear", "params":[],"transforms":[], "help_cmd": "clear [all|task_num]", "description": "clear a task from the server before an agent has picked it up"});
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
            if (callbacks[tsk['callback']]['active'] === false){
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
            if(tsk['command'] !== undefined){
                task_data.meta[tsk['callback']]['history'].push({"command": tsk['command'], "params":tsk['original_params'], "operator": tsk['operator']}); // set up our cmd history
            }else{
                task_data.meta[tsk['callback']]['history'].push({"command": "", "params": tsk['original_params'], "operator": tsk['operator']}); // set up our cmd history
            }

            task_data.meta[tsk['callback']]['history_index'] = task_data.meta[tsk['callback']]['history'].length;
            // in case this is the first task and we're waiting for it to show up, reset this
            if(!task_data.meta.hasOwnProperty(tsk['callback'])){
                task_data.meta[tsk['callback']] = {};
            }
            //console.log(meta[tsk['callback']]);
            if(!meta[tsk['callback']]['selected']){
                meta[tsk['callback']]['badges'] += 1;
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
        //console.log(rsp);
        if(rsp['task']['callback'] in all_tasks){
            //if we have that callback id in our all_tasks list
            if(!all_tasks[rsp['task']['callback']][rsp['task']['id']]){
                Vue.set(all_tasks[ rsp['task']['callback'] ], rsp['task']['id'], {"expanded": false});
            }
            //if we get a response for a task that hasn't been expanded yet to see all prior output, do that instead
            //console.log("in add_new_response, expanded is: ");
            //console.log(all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded']);
            if(all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded'] === false){
                console.log("in add_new_response, expanded is false or undefined");
                console.log(all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded']);
                get_all_responses(rsp['task']['id']);
                return;
            }
            if(!all_tasks[rsp['task']['callback']][rsp['task']['id']]['response']){
                //but we haven't received any responses for the specified task_id
                Vue.set(all_tasks[ rsp['task']['callback']] [rsp['task']['id']], 'response', {});
            }
            //console.log(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']]);
            let updated_response = rsp['response'];//.replace(/\\n|\r/g, '\n');
            // all_tasks->callback->task->response->id = timestamp, responsevalue
            Vue.set(all_tasks[rsp['task']['callback']] [rsp['task']['id']] ['response'], rsp['id'], {'timestamp': rsp['timestamp'], 'response': updated_response});

            //now that the new response has been added, potentially update the scripted version
            if(browser_scripts.hasOwnProperty(rsp['task']['command_id'])){
                all_tasks[rsp['task']['callback']][rsp['task']['id']]['use_scripted'] = true;
                all_tasks[rsp['task']['callback']][rsp['task']['id']]['scripted'] = browser_scripts[rsp['task']['command_id']](rsp['task'], Object.values(all_tasks[rsp['task']['callback']][rsp['task']['id']]['response']));
            }
            task_data.$forceUpdate();
            if(!meta[rsp['task']['callback']]['selected']){
                meta[rsp['task']['callback']]['badges'] += 1;
            }
            if(from_websocket){
                //we want to make sure we have this expanded by default
                let el = document.getElementById("bottom-tabs-content");
                if(el.scrollHeight - el.scrollTop - el.clientHeight < 1){
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
function get_all_responses(taskid){
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid, (response)=>{
         try{
             let data = JSON.parse(response);
             //console.log(data);
             all_tasks[data['task']['callback']][data['task']['id']]['expanded'] = true;
             //all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded'] = true;
             for(let resp in data['responses']){
                 //data['responses'][resp]['callback'] = data['callback']['id'];
                 //console.log(data['responses'][resp]);
                 add_new_response(data['responses'][resp], false);
             }
         }catch(error){
             alertTop("danger", "Session expired, please refresh");
         }
     }, "GET", null);
}
function startwebsocket_updatedcallbacks(){
let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedcallbacks/current_operation');
    ws.onmessage = function(event){
        if (event.data !== ""){
            let rsp = JSON.parse(event.data);
            update_callback_in_view(rsp);
        }
    };
    ws.onclose = function(){
		wsonclose();
	};
	ws.onerror = function(){
        wsonerror();
	};
}
function startwebsocket_newkeylogs(){
let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/keylogs/current_operation');
    ws.onmessage = function(event){
        if (event.data !== ""){
            let rsp = JSON.parse(event.data);
            //console.log(rsp);
            let key_stroke_alert = rsp['keystrokes'];
            alertTop("success", "<b>New Keylog from " + rsp['task'] + ": </b><pre>" + key_stroke_alert + "</pre>", 2);
            //console.log(rsp);
            if(task_data.meta[rsp['callback']['id']]['keylogs'] === true){
                //only try to update a view if the view is actually open
                let added = false;
                for(let w in task_data.meta[rsp['callback']['id']]['keylog_data']){
                   //console.log(w);
                   if(w === rsp['window']){
                       task_data.meta[rsp['callback']['id']]['keylog_data'][w].push(rsp);
                       added = true;
                       break;
                   }
                }
                if(!added){
                    Vue.set(task_data.meta[rsp['callback']['id']]['keylog_data'], rsp['window'], [rsp]);
                }
                task_data.$forceUpdate();
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
startwebsocket_newkeylogs();
function startwebsocket_commands(){
let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/all_command_info');
let got_all_commands = false;
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
                            alertTop("info", data['cmd'] + " had a parameter added in " + data['payload_type'], 10);
                            return;
                        }
                        for(let j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['params'].length; j++){
                            // now we're either updating or deleting, so we need to find that param
                            if(data['name'] === task_data.ptype_cmd_params[data['payload_type']][i]['params'][j]['name']){
                                if(data['notify'] === "deletedcommandparameters"){
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
                for(let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                    if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['command'] || task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']){
                        // now we need to do something with a transform in task_data.ptype_cmd_params[data['payload_type']][i]['transforms']
                        if(data['notify'] === "newcommandtransform"){
                            // we got a new transform, so just push it
                            task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].push(data);
                            alertTop("info", task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] + " had a transform added in " + data['payload_type'], 10);
                            return;
                        }
                        for(let j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['transforms'].length; j++){
                            if(data['id'] === task_data.ptype_cmd_params[data['payload_type']][i]['transforms'][j]['id']){
                                // now we're either updating or deleting
                                if(data['notify'] === "deletedcommandtransform"){
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
                if(data['notify'] === "newcommand"){
                    data['params'] = [];
                    data['transforms'] = [];
                    task_data.ptype_cmd_params[data['payload_type']].push(data);
                    alertTop("info", data['cmd'] + " is a new command for " + data['payload_type'], 10);
                }
                else if(data['notify'] === "deletedcommand"){
                    // we don't get 'payload_type' like normal, instead, we get payload_type_id which doesn't help
                    for (const [key, value] of Object.entries(task_data.ptype_cmd_params)) {
                      for(let i = 0; i < value.length; i++){
                        if(value[i]['id'] === data['id']){
                            // we found the value to remove
                            task_data.ptype_cmd_params[key].splice(i, 1);
                            alertTop("info", data['cmd'] + " is a no longer a command for " + data['payload_type'], 10);
                            return;
                        }
                      }
                    }
                }
                else{
                    for(let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++){
                        if(task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']){
                            Vue.set(task_data.ptype_cmd_params[data['payload_type']], i, Object.assign({}, task_data.ptype_cmd_params[data['payload_type']][i], data));
                            alertTop("info", data['cmd'] + " general info has been updated " + data['payload_type'], 10);
                        }
                    }
                }
            }

        }
        else if(got_all_commands === false){
            got_all_commands = true;
            // executed after render
            Vue.nextTick().then(function(){
                setTimeout(() => { // setTimeout to put this into event queue
                    let current_tabs = localStorage.getItem("tasks");
                    if(current_tabs !== null){
                        current_tabs = JSON.parse(current_tabs);
                        for(let i in current_tabs){
                            callback_table.interact_button(callback_table.callbacks[i]);
                        }
                    }
                    current_tabs = localStorage.getItem("screencaptures");
                    if(current_tabs !== null){
                        current_tabs = JSON.parse(current_tabs);
                        for(let i in current_tabs){
                            callback_table.show_screencaptures(callback_table.callbacks[i]);
                        }
                    }
                    current_tabs = localStorage.getItem("keylogs");
                    if(current_tabs !== null){
                        current_tabs = JSON.parse(current_tabs);
                        for(let i in current_tabs){
                            callback_table.show_keylogs(callback_table.callbacks[i]);
                        }
                    }
                    current_tabs = localStorage.getItem("process_list");
                    if(current_tabs !== null){
                        current_tabs = JSON.parse(current_tabs);
                        for(let i in current_tabs){
                            callback_table.show_process_list(callback_table.callbacks[i]);
                        }
                    }
                }, 0);
            });
        }
    };
    ws.onclose = function(){
		wsonclose();
	};
	ws.onerror = function(){
        wsonerror();
	};
}


startwebsocket_callbacks();  // get new callbacks brought into the UI
setInterval(updateClocks, 50); // update every 50 ms

startwebsocket_updatedcallbacks();  // update  callback  views in the UI

function startwebsocket_callback(cid){
    // get updated information about our callback
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/unified_callback/' + cid);
    ws.onmessage = function(event){
        if (event.data !== ""){
            let data = JSON.parse(event.data);
            //console.log("got new message through websocket: " + event.data);
            if(data['channel'] === "updatedcallback"){
                update_callback_in_view(data);
            }else if(data['channel'].includes("task")){
                data['expanded'] = true; //we're getting the task from websocket, it's already expanded
                add_new_task(data);
            }else if(data['channel'].includes("response")){
                add_new_response(data, true);
            }else{
                console.log("Unknown message from server: " + event.data);
            }
        }
    };
    ws.onclose = function(){
		//wsonclose();
	};
	ws.onerror = function(){
        //wsonerror();
	};
    return ws;
}

//autocomplete function taken from w3schools: https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  let currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function(e) {
      let a, b, i, val = task_data.input_field;
      let longest = 0;
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
        if (arr[i].substr(0, val.length).toUpperCase() === val.toUpperCase()) {
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
        a.style.width = longest + 2 + "em";
      }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function(e) {
      let x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode === 9) {
          try {
              //we want to close the autocomplete menu and fill in with the top-most element
              if(currentFocus === -1){
                  task_data.input_field = x[0].textContent;
              }else{
                  task_data.input_field = x[currentFocus].textContent;
              }
              e.preventDefault();
              closeAllLists("");
          }catch(error){
              //there must not be any autocomplete stuff, so just let it go on
          }
      } else if(e.keyCode === 38 && x !== null){
          //keycode UP arrow
          if(x.length > 0){
              currentFocus--;
              addActive(x);
              e.stopImmediatePropagation();
          }
      } else if(e.keyCode === 40 && x !== null){
          //keycode DOWN arrow
          if(x.length > 0){
              currentFocus++;
              addActive(x);
              e.stopImmediatePropagation();
          }
      } else if(e.keyCode === 27 && x !== null){
          closeAllLists();
      } else if(e.keyCode === 13 && x !== null && x.length > 0){
          if(currentFocus === -1){
              console.log(x);
              task_data.input_field = x[0].textContent;
              e.preventDefault();
              closeAllLists("");
              e.stopImmediatePropagation();
          }else{
              task_data.input_field = x[currentFocus].textContent;
              e.preventDefault();
              closeAllLists("");
              e.stopImmediatePropagation();
          }
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
  let dropdownMenu;

  // and when you show it, move it to the body
  $(window).on('show.bs.dropdown', function(e) {

    // grab the menu
    dropdownMenu = $(e.target).find('.dropdown-menu');

    // detach it and append it to the body
    $('body').append(dropdownMenu.detach());

    // grab the new offset position
    let eOffset = $(e.target).offset();

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
function updateClocks(){
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    for(let key in callbacks){
        // update each 'last_checkin' time to be now - that value
        let checkin_time = new Date(callbacks[key]['last_checkin']);
        //callbacks[key]['real_time'] = timeConversion(now - checkin_time);
        callbacks[key]['real_time'] = now - checkin_time;
    }
}
//we want to allow some keyboard shortcuts throughout the main interface
document.onkeydown = function(e){
  let key = e.which || e.keyCode;
  //console.log(key);
  if(e.ctrlKey && key === 78){
      // this is ctrl + n
      move('right');
  }else if(e.ctrlKey && key === 80){
      // this is ctrl + p
      move('left');
  }
};
function move(to, moveFromClose=false) {
    let current = $('#bottom-tabs .nav-item .active').parent()[0];
    // get the current index
    let index = -1;
    let all = $('#bottom-tabs .nav-item');
    let total = all.length;
    //console.log(current);
    if(current === undefined && total > 0){
        current = all[0];
    }
    for(let i = 0; i < total; i++){
        if(current === all[i]){
            index = i;
        }
    }
    if(index === -1 && total === 0){return;}
    let add;
    switch (to) {
      case 'left':
        add = -1;
        break;
      case 'right':
        add = 1;
        break;
    }
    //task_data.select_tab();
    let new_index = (index+add)%total;
    if(moveFromClose && new_index  ===  -1){
        //don't move  to the end, move back one instead
        new_index = 1;
    }
    else if(new_index ===-1){new_index = total-1;}
    //console.log(new_index);
    let new_tab = all[new_index];
    //console.log(new_tab);
    //need to get the callback ID
    let new_id = new_tab.children[0].id.match(/\w(\d+)\w/)[1];
    task_data.select_tab(meta[new_id]);
    setTimeout(() => { // setTimeout to put this into event queue
        // executed after render
        new_tab.children[0].click();
        new_tab.children[0].click();
    }, 0);

    //new_tab.children[0].click();
  }
function timeConversion(millisec){
    let seconds = Math.trunc(((millisec / 1000)) % 60);
    let minutes = Math.trunc(((millisec / (1000 * 60))) % 60);
    let hours = Math.trunc(((millisec / (1000 * 60 * 60))) % 24);
    let days = Math.trunc(((millisec / (1000 * 60 * 60 * 24))) % 365);
    return days + ":" + hours + ":" + minutes + ":" + seconds;
}
function generate_background_color(cid){
    //https://github.com/davidmerfield/randomColor
    if( '{{config["new-callback-hue"]}}' !== ''){
        return randomColor({luminosity: '{{ config["new-callback-color"] }}', hue:'{{config["new-callback-hue"]}}', seed: cid});
    }
    else{
        return randomColor({luminosity: '{{ config["new-callback-color"] }}', seed: cid});
    }
}
function shadeBlend(p,c0,c1) {
    let n=p<0?p*-1:p,u=Math.round,w=parseInt;
    if(c0.length>7){
        var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
        return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
    }else{
        var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
        return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
    }
}
function remove_from_storage(group, id){
    let current_tabs = localStorage.getItem(group);
    if(current_tabs === null){
        current_tabs = {};
    }else{
        current_tabs = JSON.parse(current_tabs);
    }
    if(current_tabs.hasOwnProperty(id)){
        delete current_tabs[id];
    }
    localStorage.setItem(group, JSON.stringify(current_tabs));
}
function add_to_storage(group, id){
    let current_tabs = localStorage.getItem(group);
    if(current_tabs === null){
        current_tabs = {};
    }else{
        current_tabs = JSON.parse(current_tabs);
    }
    if(!(id in current_tabs)){
        current_tabs[id] = callback_table.callbacks[id]['personal_description'];
    }
    localStorage.setItem(group, JSON.stringify(current_tabs));
}