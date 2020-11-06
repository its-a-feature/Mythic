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
// Get the initial set of data about our callback and already known commands/responses
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/{{cid}}/all_tasking", get_all_tasking_callback, "GET", null);
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/", get_callback_options_callback, "GET", null);
// Vue that we'll use to display everything
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks: {},
        ptype_cmd_params: {}, //where we keep track of payload type -> command -> command_parameter mappings for what has called in
        callback_options: [],
        task_filters: {
            "task": {"active": false, "range_low": 0, "range_high": 1000000},
            "operator": {"active": false, "username": ""},
            "command": {"active": false, "cmd": ""}
        }
    },
    methods: {
        task_button: function (data) {
            //submit the input_field data as a task, need to know the current callback id though
            //first check if there are any active auto-complete tabs. If there are, we won't submit.
            let autocomplete_list = document.getElementById(data.id + "autocomplete-list");
            if (autocomplete_list !== null && autocomplete_list.hasChildNodes()) {
                return;
            }
            let task = this.callbacks[data.id].input_field.trim().split(" ");
            let command = task[0].trim();
            let params = "";
            if (task.length > 1) {
                params = task.slice(1,).join(' '); //join index 1 to the end back into a string of params
            }
            // first check to see if we have any information about this payload time to leverage
            if (this.callbacks[data['id']]['payload_type'] in this.ptype_cmd_params) {
                //now loop through all of the commands we have to see if any of them match what was typed
                for (let i = 0; i < this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']].length; i++) {
                    //special category of trying to do a local help
                    if (command === "help") {
                        if (this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['cmd'] === params) {
                            alertTop("info", "<b>Usage: </b>" + this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['help_cmd'] +
                                "<br><b>Description:</b><pre style=\"word-wrap:break-word;white-space:pre-wrap\">" + this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['description'] +
                                "</pre><br><b>Note: </b>All commands for " + this.callbacks[data['id']]['payload_type'] +
                                " can be found in the <a target='_blank' href=\"http://{{links.server_ip}}:{{links.DOCUMENTATION_PORT}}/agents/\" style='color:darkblue'> Help Container</a>", 0, "Command Help", false);
                            return;
                        } else if (params.length === 0) {
                            alertTop("info", "<b>Usage: </b> help {command_name}" +
                                "<br><b>Note: </b>All commands for " + this.callbacks[data['id']]['payload_type'] +
                                " can be found in the <a target='_blank' href=\"http://{{links.server_ip}}:{{links.DOCUMENTATION_PORT}}/agents/\" style='color:darkblue'> Help Container</a>", 0, "Command Help", false);
                            return;
                        }
                    }
                    //special category of trying to do a local set command
                    else if (command === "set") {
                        if (task.length >= 3) {
                            let set_value = task.slice(2,).join(' ');
                            if (task[1] === "parent") {
                                set_value = parseInt(set_value);
                            }
                            let set_data = {};
                            set_data[task[1]] = set_value;
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + data['id'],
                                function (response) {
                                    try {
                                        let rdata = JSON.parse(response);
                                        if (rdata['status'] === 'success') {
                                            alertTop("success", "Successfully modified current callback's metadata", 1);
                                            callback_table.callbacks[data['id']].input_field = "";
                                        } else {
                                            alertTop("danger", "Failed to set current callback's metadata: " + rdata['error']);
                                        }
                                    } catch (error) {
                                        alertTop("danger", "Session expired, please refresh");
                                    }

                                }, "PUT", set_data);
                        } else {
                            alertTop("danger", "Wrong number of params for set. Should be set {field} {value}");
                            return;
                        }
                        return;
                    }
                    //if we find our command that was typed
                    else if (this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['cmd'] === command) {
                        // if they didn't type any parameters, but we have some registered for this command, display a GUI for them
                        if (params.length === 0 && this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'].length !== 0) {
                            //if somebody specified command arguments on the commandline without going through the GUI, by all means, let them
                            //  This is for if they want the GUI to auto populate for them
                            //  Also make sure that there are actually parameters for them to fill out
                            params_table.command_params = [];
                            params_table.cmd = this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i];

                            for (let j = 0; j < this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'].length; j++) {
                                let blank_vals = {
                                    "string_value": "",
                                    "credential_value": "",
                                    "credential_id": 0,
                                    "number_value": -1,
                                    "choice_value": "",
                                    "choicemultiple_value": [],
                                    "boolean_value": false,
                                    "array_value": [],
                                    'payloadlist_value': "",
                                    'agentconnect_c2profile': -1,
                                    'agentconnect_host': "",
                                    "agentconnect_payload": "",
                                    "payloads": []
                                };
                                if (params_table.payloads.length > 0) {
                                    blank_vals['payloadlist_value'] = params_table.payloads[0].uuid
                                }
                                let param = Object.assign({}, blank_vals, this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'][j]);
                                if (param.choices.length > 0) {
                                    param.choice_value = param.choices.split("\n")[0];
                                }
                                if(param.type === "Array"){
                                    param.array_value = JSON.parse(param.default_value);
                                }else if(param.type === "String"){
                                    param.string_value = param.default_value;
                                }else if(param.type === "Number"){
                                    param.number_value = param.default_value;
                                }else if(param.type === "Boolean"){
                                    param.boolean_value = param.default_value;
                                }
                                if (param.type === 'PayloadList') {
                                    // we only want to add to param.payloads things from params_table.payloads that match the supported_agent types listed
                                    let supported_agents = param.supported_agents.split("\n");
                                    if (supported_agents.indexOf("") !== -1) {
                                        supported_agents.splice(supported_agents.indexOf(""), 1);
                                    }
                                    if (supported_agents.length === 0) {
                                        param.payloads = params_table.payloads;
                                    } else {
                                        for (let k = 0; k < params_table.payloads.length; k++) {
                                            if (supported_agents.includes(params_table.payloads[k]['payload_type'])) {
                                                param.payloads.push(params_table.payloads[k]);
                                            }
                                        }
                                    }
                                    param.payloads.sort((a, b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
                                    param['payloadlist_value'] = param.payloads.length > 0 ? param.payloads[0].uuid : "";
                                }
                                params_table.command_params.push(param);
                            }
                            params_table.command_params.sort((a, b) => (b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
                            $('#paramsModal').modal('show');
                            $('#paramsSubmit').unbind('click').click(function () {
                                let param_data = {};
                                let file_data = {};  //mapping of param_name to uploaded file data
                                for (let k = 0; k < params_table.command_params.length; k++) {
                                    if (params_table.command_params[k]['type'] === "String") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['string_value'];
                                    } else if (params_table.command_params[k]['type'] === "Credential-JSON") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = {
                                                    'account': x['account'],
                                                    'realm': x['realm'],
                                                    'credential': x['credential'],
                                                    'credential_type': x['type']
                                                };
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Account") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['account'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Realm") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['realm'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Type") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['type'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Credential") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['credential'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Number") {
                                        param_data[params_table.command_params[k]['name']] = parseInt(params_table.command_params[k]['number_value']);
                                    } else if (params_table.command_params[k]['type'] === "Choice") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choice_value'];
                                    } else if (params_table.command_params[k]['type'] === "ChoiceMultiple") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choicemultiple_value'];
                                    } else if (params_table.command_params[k]['type'] === "Boolean") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['boolean_value'];
                                    } else if (params_table.command_params[k]['type'] === "Array") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['array_value'];
                                    } else if (params_table.command_params[k]['type'] === "File") {
                                        let param_name = params_table.command_params[k]['name'];
                                        file_data[param_name] = document.getElementById('fileparam' + param_name).files[0];
                                        param_data[param_name] = "FILEUPLOAD";
                                        document.getElementById('fileparam' + param_name).value = "";
                                        //console.log(document.getElementById('fileparam' + param_name));
                                    } else if (params_table.command_params[k]['type'] === 'PayloadList') {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['payloadlist_value'];
                                    } else if (params_table.command_params[k]['type'] === 'AgentConnect') {
                                        param_data[params_table.command_params[k]['name']] = {
                                            "host": params_table.command_params[k]['agentconnect_host']
                                        };
                                        //console.log( params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]);
                                        if (params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['type'] === 'payload') {
                                            //param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['payload']['uuid'];
                                            param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['payload']['uuid'];
                                        } else {
                                            //param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['agent_callback_id'];
                                            param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['agent_callback_id'];
                                        }
                                        if (params_table.command_params[k]['agentconnect_c2profile'] === -1) {
                                            // they didn't select a specific c2 profile, so send the list
                                            param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['supported_profiles'];
                                        } else {
                                            // param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['supported_profiles'][params_table.command_params[k]['agentconnect_c2profile']];
                                            //console.log()
                                            param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.command_params[k]['c2profiles'][params_table.command_params[k]['agentconnect_c2profile']];

                                        }
                                    }
                                }
                                //if it is a test command we can go ahead and send it down (since it would be skipped by the above)
                                uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['id'], post_task_callback_func, file_data,
                                    {"command": command, "params": JSON.stringify(param_data)});
                                callback_table.callbacks[data['id']].input_field = "";
                            });

                        } else {
                            //somebody knows what they're doing or a command just doesn't have parameters, send it off
                            if(this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'].length !== 0){
                                for (let j = 0; j < this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'].length; j++) {
                                    if(this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'][j]["type"] === "File" && this.ptype_cmd_params[this.callbacks[data['id']]['payload_type']][i]['params'][j]["required"]){
                                        alertTop("warning", "This command requires files to be uploaded through a dialog box.", 6);
                                        this.callbacks[data['id']].input_field = command;
                                        callback_table.task_button(this.callbacks[data['id']]);
                                        return;
                                    }
                                }
                            }
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['id'], post_task_callback_func, "POST",
                                {"command": command, "params": params});

                            //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                            this.callbacks[data['id']].input_field = "";
                        }
                        return;
                    }
                }
                //If we got here, that means we're looking at an unknown command
                if (command === "help") {
                    // just means we never found the param command to help out with
                    alertTop("warning", "Unknown command: " + params, 2);
                } else {
                    if (command !== "") {
                        alertTop("warning", "Unknown command: " + command, 2);
                    }
                }
            }

        },
        cmd_history_up: function (callback) {
            if ($('.autocomplete-items').children().length > 0) {
                return;
            }
            callback['history_index'] -= 1;
            if (callback['history_index'] < 0) {
                callback['history_index'] = 0;
            }
            let index = callback['history_index'];
            callback.input_field = callback['history'][index];

        },
        cmd_history_down: function (callback) {
            if ($('.autocomplete-items').children().length > 0) {
                return;
            }
            callback['history_index'] += 1;
            if (callback['history_index'] >= callback['history'].length) {
                callback['history_index'] = callback['history'].length;
                callback.input_field = "";
            } else {
                let index = callback['history_index'];
                callback.input_field = callback['history'][index];
            }
        },
        download_raw_output: function (taskid) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid + "/raw_output", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        download_from_memory("task_" + taskid + ".txt", data['output']);
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    alertTop("danger", "Session expired, please refresh");
                    console.log(error.toString());
                }
            }, "GET", null);

        },
        toggle_comment: function (task) {
            if (task.comment_visible) {
                Vue.set(task, 'comment_visible', false);
            } else {
                Vue.set(task, 'comment_visible', true);
            }
        },
        toggle_arrow: function (task) {
            $('#cardbody' + task.id).unbind('shown.bs.collapse').on('shown.bs.collapse', function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + task.id, (response) => {
                    try {
                        let data = JSON.parse(response);
                        task.responses = data['responses'];
                        if (task['command_id'] in browser_scripts) {
                            task['use_scripted'] = true;
                            task['scripted'] = browser_scripts[task['command_id']](task, Object.values(task['responses']));
                        }
                    } catch (error) {
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "GET", null);
                $('#color-arrow' + task.id).removeClass('fa-plus').addClass('fa-minus');
            });
            $('#cardbody' + task.id).unbind('hidden.bs.collapse').on('hidden.bs.collapse', function () {
                $('#color-arrow' + task.id).removeClass('fa-minus').addClass('fa-plus');
            });
        },
        add_comment: function (task) {
            $('#addCommentTextArea').val(task.comment);
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
                $("#addCommentTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $('#addCommentSubmit').click();
                    }
                });
            });
            $('#addCommentModal').modal('show');
            $('#addCommentSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, add_comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        remove_comment: function (id) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, remove_comment_callback, "DELETE", null);
        },
        get_cmd_index: function (callback_id) {
            if (this.callbacks[callback_id] === undefined) {
                return -1
            }
            let cmd = this.callbacks[callback_id].input_field.split(" ")[0];
            if (cmd !== "") {
                for (let i = 0; i < this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']].length; i++) {
                    if (cmd === this.ptype_cmd_params[this.callbacks[callback_id]['payload_type']][i]['cmd']) {
                        return i;
                    }
                }
            }
            return -1;
        },
        get_payload_type: function (callback_id) {
            return this.callbacks[callback_id]['payload_type'];
        },
        add_callback_to_table: function () {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + $('#callback_options_select').val() + "/all_tasking", get_all_tasking_callback, "GET", null);
        },
        remove_callback: function (callback) {
            this.callbacks[callback.id]['websocket'].close();
            delete this.callbacks[callback.id];
        },
        apply_filter: function (task) {
            // determine if the specified task should be displayed based on the task_filters set
            let status = true;
            if (this.task_filters['task']['active'] && task.id !== undefined) {
                status = status && task.id <= this.task_filters['task']['range_high'] && task.id >= this.task_filters['task']['range_low'];
            }
            if (this.task_filters['operator']['active'] && task.operator !== undefined) {
                status = status && task.operator.includes(this.task_filters['operator']['username']);
            }
            if (this.task_filters['command']['active'] && task.command !== undefined) {
                status = status && task.command.includes(this.task_filters['command']['cmd']);
            }
            // if nothing is active, default to true
            return status;
        }
    },
    computed: {
        hasFiltersSet: function () {
            return this.task_filters['task']['active'] || this.task_filters['operator']['active'] || this.task_filters['command']['cmd'];
        },
    },
    delimiters: ['[[', ']]'],
});
function get_callback_options_callback(response) {
    try {
        let data = JSON.parse(response);
        callback_table.callback_options = data;
        callback_table.callback_options.sort((a, b) => (b.id > a.id) ? 1 : ((a.id > b.id) ? -1 : 0));
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

function get_all_tasking_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            let temp = {};
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
            Vue.nextTick(function () {
                if ('tasks' in data) {
                    for (let i = 0; i < data['tasks'].length; i++) {
                        add_new_task(data['tasks'][i]);
                    }
                }
            });
            temp['type'] = 'callback';
            Vue.nextTick().then(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + data['payload_type_id'] + "/commands", register_new_command_info, "GET", null);
                callback_table.callbacks[data['id']]['websocket'] = startwebsocket_callback(data['id']);
            });
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

//we will get back a series of commands and their parameters for a specific payload type, keep track of this in ptype_cmd_params so we can
//  respond to help requests and build dynamic forms for getting command data
function register_new_command_info(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            delete data['status'];
            data['commands'].push({"cmd": "help", "params": []});
            data['commands'].push({"cmd": "set", "params": []});
            data['commands'].push({"cmd": "clear", "params": []});
            callback_table.ptype_cmd_params[data['commands'][0]['payload_type']] = data['commands'];
            for (let id in callback_table.callbacks) {
                if (callback_table.callbacks[id]['payload_type'] === data['commands'][0]['payload_type']) {
                    //console.log("about to set autocomplete for " + id + ":" + data['commands'][0]['payload_type']);
                    //input = document.getElementById("commandline:" + data['commands'][0]['payload_type'] + ":" + id);
                    autocomplete(document.getElementById("commandline:" + data['commands'][0]['payload_type'] + ":" + id), callback_table.callbacks[id]["commands"]);
                }
            }
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }

}

function add_new_task(tsk) {
    try {
        //console.log("in add_new_task: " + JSON.stringify(tsk));
        if (tsk.id in callback_table.callbacks[tsk['callback']]['tasks']) {
            // we already have this task, so we're actually going to update it
            Vue.set(callback_table.callbacks[tsk['callback']]['tasks'], tsk['id'], Object.assign({}, callback_table.callbacks[tsk['callback']]['tasks'][tsk.id], tsk));
        } else {
            tsk.href = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + tsk.id;
            let tmp = Object.assign({}, tsk);
            Vue.set(callback_table.callbacks[tsk['callback']]['tasks'], tsk['id'], tmp);
            callback_table.callbacks[tsk['callback']]['history'].push(tsk['command'] + " " + tsk['original_params']); // set up our cmd history
            callback_table.callbacks[tsk['callback']]['history_index'] = callback_table.callbacks[tsk['callback']]['history'].length;
            if (Math.abs((Math.floor($('#callbackoutput' + tsk['callback']).scrollTop()) + $('#callbackoutput' + tsk['callback']).height() - $('#callbackoutput' + tsk['callback'])[0].scrollHeight)) < 40) {
                setTimeout(() => {
                    Vue.nextTick(function () {
                        //if we're looking at the bottom of the content, scroll
                        $('#callbackoutput' + tsk['callback']).scrollTop($('#callbackoutput' + tsk['callback'])[0].scrollHeight);
                    });
                }, 0);
            }
        }
    } catch (e) {
        console.log(e);
        console.log(e.toString());
    }
}

function add_new_response(rsp, from_websocket) {
    //console.log("got  response");
    try {
        if (rsp['task']['id'] in callback_table.callbacks[rsp['task']['callback']]['tasks']) {

            //now that we found the right task, check to see if this is the first response or not
            if (callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses'] === undefined) {
                //but we haven't received any responses for the specified task_id
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses'] = {};
            }
            //console.log(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']]);
            let updated_response = rsp['response'];
            Vue.set(callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses'], rsp['id'], {
                'timestamp': rsp['timestamp'],
                'response': updated_response
            });
            if (rsp['task']['command_id'] in browser_scripts) {
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['use_scripted'] = true;
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['scripted'] = browser_scripts[rsp['task']['command_id']](rsp['task'], Object.values(callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['responses']));
            }
            callback_table.$forceUpdate();
            if (from_websocket) {
                //we want to make sure we have this expanded by default
                callback_table.callbacks[rsp['task']['callback']]['tasks'][rsp['task']['id']]['expanded'] = true;
                $('#cardbody' + rsp['task']['id']).collapse('show');
                let el = document.getElementById('callbackoutput' + rsp['task']['callback']);
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
                    //if we're looking at the bottom of the content, scroll
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function () {
                        $('#callbackoutput' + rsp['task']['callback']).scrollTop($('#callbackoutput' + rsp['task']['callback'])[0].scrollHeight);
                        $('#color-arrow' + rsp['task']['id']).removeClass('fa-plus').addClass('fa-minus');
                    });
                } else {
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function () {
                        $('#color-arrow' + rsp['task']['id']).removeClass('fa-plus').addClass('fa-minus');
                    });
                }

            }
        }
    } catch (error) {
        console.log("error in add_new_response");
        console.log(error.stack);
        console.log(error.toString());
    }
}

function startwebsocket_callback(cid) {
    // get updated information about our callback
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/unified_callback/' + cid);
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            //console.log("got new message through websocket: " + event.data);
            if (data['channel'] === "updatedcallback") {
                Vue.set(callback_table.callbacks, data['id'], Object.assign({}, callback_table.callbacks[data['id']], data));
                if (document.title !== data['description']) {
                    document.title = data['description'];
                }
                data['type'] = 'callback';
                if (data['host'] in params_table.payloadonhost) {
                    for (let i = 0; i < params_table.payloadonhost[data['host']].length; i++) {
                        if (params_table.payloadonhost[data['host']][i]['id'] === data['id']) {
                            Vue.set(params_table.payloadonhost[data['host']], i, data);
                            //params_table.payloadonhost[rsp['host']][i] = rsp;
                            params_table.$forceUpdate();
                            return;
                        }
                    }
                } else {
                    //something went wrong, but still add it
                    params_table.payloadonhost[data['host']] = [data];
                }
            } else if (data['channel'].includes("task")) {
                add_new_task(data);
            } else if (data['channel'].includes("response")) {
                add_new_response(data, true);
            } else if (data['channel'].includes("loadedcommand")){
                update_loaded_commands(data);
            }
        }
    }
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
    return ws;
}

function update_loaded_commands(data){
    if (!Object.prototype.hasOwnProperty.call(callback_table.callbacks[data['callback']], 'commands')) {
        callback_table.callbacks[data['callback']]['commands'] = [];
    }
    if(data['channel'].includes("new")){
        callback_table.callbacks[data['callback']]['commands'].push({"name": data['command'], "version": data["version"]});
        callback_table.callbacks[data['callback']]['commands'].sort((a, b) => (b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
    }else if(data['channel'].includes("updated")){
        for(let i = 0; i < callback_table.callbacks[data['callback']]['commands'].length; i++){
            if(callback_table.callbacks[data['callback']]['commands'][i]["name"] === data["command"]){
                callback_table.callbacks[data['callback']]['commands'][i]["version"] = data["version"];
                return;
            }
        }
    } else{
        for(let i = 0; i < callback_table.callbacks[data['callback']]['commands'].length; i++){
            if(callback_table.callbacks[data['callback']]['commands'][i]["name"] === data["command"]){
                delete callback_table.callbacks[data['callback']]['commands'][i];
                return;
            }
        }
    }
}

function add_comment_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== 'success') {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function remove_comment_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== 'success') {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
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
    methods: {
        restore_default_values: function(){
            for(let i = 0; i < this.command_params.length; i ++){
                if(this.command_params[i].type === "Array"){
                    this.command_params[i].array_value = JSON.parse(this.command_params[i].default_value);
                }else if(this.command_params[i].type === "String"){
                    this.command_params[i].string_value = this.command_params[i].default_value;
                }else if(this.command_params[i].type === "Number"){
                    this.command_params[i].number_value = this.command_params[i].default_value;
                }else if(this.command_params[i].type === "Boolean"){
                    this.command_params[i].boolean_value = this.command_params[i].default_value;
                }
            }
        },
        command_params_add_array_element: function (param) {
            param.array_value.push('');
        },
        command_params_remove_array_element: function (param, index) {
            param.array_value.splice(index, 1);
        },
        manually_add_payloadonhost: function (param) {
            Vue.set(param, "manually_add_payloadonhost", true);
            Vue.set(param, "manually_add_payloadonhost_hostname", "");
            Vue.set(param, "manually_add_payloadonhost_template", this.payloads[0].uuid);
        },
        cancel_manually_add_payloadonhost: function (param) {
            Vue.set(param, "manually_add_payloadonhost", false);
            Vue.set(param, "manually_add_payloadonhost_hostname", "");
            Vue.set(param, "manually_add_payloadonhost_template", "");
        },
        submit_manually_add_payloadonhost: function (param) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadonhost/", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        //it should auto-populate in the rest of the dialog
                        Vue.set(param, "agentconnect_host", "");
                        Vue.set(param, "agentconnect_payload", "");
                        Vue.set(param, "c2profiles", []);
                        Vue.set(param, "agentconnect_c2profile", -1);
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString() + " in submit_manually_add_payloadonhost");
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {
                "host": param.manually_add_payloadonhost_hostname,
                "uuid": param.manually_add_payloadonhost_template
            });
            Vue.set(param, "manually_add_payloadonhost", false);
            Vue.set(param, "manually_add_payloadonhost_hostname", "");
            Vue.set(param, "manually_add_payloadonhost_template", "");
        },
        delete_host: function (param) {
            if (param.agentconnect_host === "") {
                return
            }
            let host = btoa(param.agentconnect_host);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadonhost/host/" + host, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        //it should auto-populate in the rest of the dialog
                        param.agentconnect_payload = "";
                        param.c2profiles = [];
                        param.agentconnect_c2profile = -1;
                        param.payloads = [];
                        param.agentconnect_host = "";
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString() + " in submit_manually_add_payloadonhost");
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "DELETE", null);
        },
        delete_payload_on_host: function (param) {
            if (param.agentconnect_host === "") {
                return
            }
            if (param.agentconnect_payload === "") {
                return
            }
            if (params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload]['type'] === 'callback') {
                return
            }
            let payload = params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload]['id'];
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadonhost/payload/" + payload, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        //it should auto-populate in the rest of the dialog
                        param.agentconnect_payload = "";
                        param.c2profiles = [];
                        param.agentconnect_c2profile = -1;
                        let payloads = [];
                        //console.log(data);
                        params_table.payloadonhost[param.agentconnect_host].forEach((x) => {
                            //console.log(x);
                            for (let i = 0; i < x['supported_profiles'].length; i++) {
                                if (x['supported_profiles'][i]['is_p2p'] && x['id'] !== data['payload']['id']) {
                                    payloads.push(x);
                                    break;
                                }
                            }
                        });
                        param.payloads = payloads;
                        param.agentconnect_host = "";
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString() + " in submit_manually_add_payloadonhost");
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "DELETE", null);
        },
        select_specific_payload_on_host: function (param) {
            if (param.agentconnect_host !== "") {
                let payloads = [];
                params_table.payloadonhost[param.agentconnect_host].forEach((x) => {
                    //console.log(x);
                    for (let i = 0; i < x['supported_profiles'].length; i++) {
                        if (x['supported_profiles'][i]['is_p2p']) {
                            payloads.push(x);
                            break;
                        }
                    }
                });
                param.payloads = payloads;
                param.agentconnect_c2profile = -1;
                param.agentconnect_payload = "";
                param.c2profiles = [];
            } else {
                param.payloads = [];
                param.c2profiles = [];
                param.agentconnect_c2profile = -1;
                param.agentconnect_payload = "";
            }
            params_table.$forceUpdate();
        },
        select_specific_c2profile_in_agent: function (param) {
            if (params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload] !== undefined) {
                param.c2profiles = param.payloads[param.agentconnect_payload]['supported_profiles'];
                param.agentconnect_c2profile = -1;
            } else {
                param.c2profiles = [];
                param.agentconnect_c2profile = -1;
            }
        },
        split_input_params: function (param, index) {
            if (param.array_value[index].includes("\n")) {
                let pieces = param.array_value[index].split("\n");
                for (let i = 1; i < pieces.length; i++) {
                    param.array_value.push(pieces[i]);
                }
                param.array_value[index] = pieces[0];
            }
        },
        credential_filter: function (component) {
            return this.credentials.filter(function (value, index, arr) {
                for (let i = 0; i < index; i++) {
                    if (value[component] === arr[i][component]) {
                        return false;
                    }
                }
                return true;
            });
        }
    },
    computed: {
        accounts: function () {
            return this.credential_filter('account');
        },
        realms: function () {
            return this.credential_filter('realm');
        },
        types: function () {
            return this.credential_filter('type');
        },
        credentials_unique: function () {
            return this.credential_filter('credential');
        }
    },
    delimiters: ['[[', ']]']
});

function post_task_callback_func(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'error') {
            alertTop("danger", data['error']);
            if ('cmd' in data) {
                callback_table.callbacks[data['callback']]['input_field'] = data['cmd'] + " " + data['params'];
            }
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

function startwebsocket_commands() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/all_command_info');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            // first determine if we're dealing with command, parameter
            if (data['notify'].includes("parameters")) {
                // we're dealing with new/update/delete for a command parameter
                for (let i = 0; i < callback_table.ptype_cmd_params[data['payload_type']].length; i++) {
                    if (callback_table.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']) {
                        // now we need to do something with a param in task_data.ptype_cmd_params[data['payload_type']][i]['params']
                        if (data['notify'] === "newcommandparameters") {
                            // we got a new parameter, so just push it
                            callback_table.ptype_cmd_params[data['payload_type']][i]['params'].push(data);
                            return;
                        }
                        for (let j = 0; j < callback_table.ptype_cmd_params[data['payload_type']][i]['params'].length; j++) {
                            // now we're either updating or deleting, so we need to find that param
                            if (data['name'] === callback_table.ptype_cmd_params[data['payload_type']][i]['params'][j]['name']) {
                                if (data['notify'] === "deletedcommandparameters") {
                                    // now we found the parameter to remove
                                    callback_table.ptype_cmd_params[data['payload_type']][i]['params'].splice(j, 1);
                                    return;
                                } else {
                                    // we're editing the parameter and found the one to edit
                                    Vue.set(callback_table.ptype_cmd_params[data['payload_type']][i]['params'], j, data);
                                    return;
                                }
                            }
                        }
                    }
                }
            } else {
                // we're dealing with new/update/delete for a command
                if (data['notify'] === "newcommand") {
                    data['params'] = [];
                    callback_table.ptype_cmd_params[data['payload_type']].push(data);
                } else if (data['notify'] === "deletedcommand") {
                    // we don't get 'payload_type' like normal, instead, we get payload_type_id which doesn't help
                    for (const [key, value] of Object.entries(callback_table.ptype_cmd_params)) {
                        for (let i = 0; i < value.length; i++) {
                            if (value[i]['id'] === data['id']) {
                                // we found the value to remove
                                callback_table.ptype_cmd_params[key].splice(i, 1);
                                return;
                            }
                        }
                    }
                } else {
                    for (let i = 0; i < callback_table.ptype_cmd_params[data['payload_type']].length; i++) {
                        if (callback_table.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']) {
                            Vue.set(callback_table.ptype_cmd_params[data['payload_type']], i, Object.assign({}, callback_table.ptype_cmd_params[data['payload_type']][i], data));
                        }
                    }
                }
            }

        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_commands();

function startwebsocket_parameter_hints() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/parameter_hints/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            //console.log(event.data);
            try {
                let data = JSON.parse(event.data);
                if (data['channel'] === 'newpayload') {
                    let payload_list_selection = "";
                    if (data['tag'].includes("Autogenerated from task")) {
                        return;
                    }
                    data['location'] = data['file_id']['filename'];
                    payload_list_selection += data.location + " - ";
                    let profiles = new Set();
                    for (let i = 0; i < data.supported_profiles.length; i++) {
                        profiles.add(data.supported_profiles[i]['name']);
                    }
                    payload_list_selection += Array.from(profiles);
                    payload_list_selection += " - " + data.tag;
                    if (payload_list_selection.length > 90) {
                        payload_list_selection = payload_list_selection.substring(0, 90) + "...";
                    }
                    data['payload_list_selection'] = payload_list_selection;
                    params_table.payloads.push(data);
                } else if (data['channel'] === 'updatedpayload') {
                    if (data['tag'].includes("Autogenerated from task")) {
                        return;
                    }
                    for (let i = 0; i < params_table.payloads.length; i++) {
                        if (params_table.payloads[i]['id'] === data['id']) {
                            if (data['deleted'] === true) {
                                params_table.payloads.splice(i, 1);
                                return;
                            }
                            let payload_list_selection = "";
                            data['location'] = data['file_id']['filename'];
                            payload_list_selection += data.location + " - ";
                            let profiles = new Set();
                            for (let j = 0; j < data.supported_profiles.length; j++) {
                                profiles.add(data.supported_profiles[j]['name']);
                            }
                            payload_list_selection += Array.from(profiles);
                            //payload_list_selection += profiles.values().toString();
                            payload_list_selection += " - " + data.payload_type + " - " + data.tag;
                            data['payload_list_selection'] = payload_list_selection;
                            params_table.payloads[i] = data;
                            break;
                        }
                    }
                } else if (data['channel'] === 'newcredential') {
                    params_table.credentials.push(data);
                    params_table.credentials.sort((a, b) => (b.account > a.account) ? -1 : ((a.account > b.account) ? 1 : 0));
                } else if (data['channel'] === 'updatedcredential') {
                    for (let i = 0; i < params_table.credentials.length; i++) {
                        if (params_table.credentials[i]['id'] === data['id']) {
                            if (data['deleted'] === true) {
                                params_table.credentials.splice(i, 1);
                                params_table.credentials.sort((a, b) => (b.account > a.account) ? -1 : ((a.account > b.account) ? 1 : 0));
                                return;
                            }
                            params_table.credentials[i] = data;
                            break;
                        }
                    }
                } else if (data['channel'] === 'newpayloadonhost') {
                    //console.log(data);
                    data['type'] = 'payload';
                    if (data['host'] === undefined) {
                        return
                    }
                    if (data['host'] in params_table.payloadonhost) {
                        Vue.set(params_table.payloadonhost[data['host']], params_table.payloadonhost[data['host']].length, data);
                        //params_table.payloadonhost[data['host']].push(data);
                    } else {
                        Vue.set(params_table.payloadonhost, data['host'], [data]);
                        //params_table.payloadonhost[data['host']] = [data];
                    }
                } else if (data['channel'] === 'updatedpayloadonhost') {
                    //console.log(data);
                    data['type'] = 'payload';
                    for (let i = 0; i < params_table.payloadonhost[data['host']].length; i++) {
                        if (params_table.payloadonhost[data['host']][i]['id'] === data['id']) {
                            if (data['deleted'] === true) {
                                //params_table.payloadonhost[data['host']].splice(i, 1);
                                Vue.delete(params_table.payloadonhost[data['host']], i);
                                if (params_table.payloadonhost[data['host']].length === 0) {
                                    delete params_table.payloadonhost[data['host']];
                                }
                                params_table.$forceUpdate();
                                return;
                            }
                            Vue.set(params_table.payloadonhost[data['host']], i, data);
                            //params_table.payloadonhost[data['host']][i] = data;
                            break;
                        }
                    }
                }
                params_table.$forceUpdate();
            } catch (error) {
                console.log(error.toString());
            }
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_parameter_hints();

function updateClocks() {
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    for (let key in callback_table.callbacks) {
        // update each 'last_checkin' time to be now - that value
        let checkin_time = new Date(callback_table.callbacks[key]['last_checkin']);
        callback_table.callbacks[key]['real_time'] = timeConversion(now - checkin_time);
    }
}

function timeConversion(millisec) {
    let output = "";
    let seconds = Math.trunc(((millisec / 1000)) % 60);
    let minutes = Math.trunc(((millisec / (1000 * 60))) % 60);
    let hours = Math.trunc(((millisec / (1000 * 60 * 60))) % 24);
    let days = Math.trunc(((millisec / (1000 * 60 * 60 * 24))) % 365);
    if (days > 1) {
        output = output + days + " Days ";
    } else if (days > 0) {
        output = output + days + " Day ";
    }
    if (hours > 1) {
        output = output + hours + " Hours ";
    } else if (hours > 0) {
        output = output + hours + " Hour ";
    }
    if (minutes > 1) {
        output = output + minutes + " Minutes ";
    } else if (minutes > 0) {
        output = output + minutes + " Minute ";
    }
    if (seconds > 1) {
        output = output + seconds + " Seconds ";
    } else if (seconds > 0) {
        output = output + seconds + " Second ";
    }
    return output;
    //return days + ":" + hours + ":" + minutes + ":" + seconds;
}

setInterval(updateClocks, 50);

//autocomplete function taken from w3schools: https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    let currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function () {
        let a, b, i;
        let longest = 0;
        let callback_id = this.id.split(":")[2];
        let val = callback_table.callbacks[callback_id]['input_field'];
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) {
            return false;
        }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", callback_id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        a.setAttribute("style", "max-height:calc(40vh);overflow-y:auto");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < callback_table.callbacks[callback_id]["commands"].length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (callback_table.callbacks[callback_id]["commands"][i]["name"].toUpperCase().includes(val.toUpperCase())) {
                /*create a DIV element for each matching element:*/
                if (callback_table.callbacks[callback_id]["commands"][i]["name"].length > longest) {
                    longest = callback_table.callbacks[callback_id]["commands"][i]["name"].length;
                }
                b = document.createElement("DIV");
                /*make the matching letters bold:*/
                let start = callback_table.callbacks[callback_id]["commands"][i]["name"].toUpperCase().indexOf(val.toUpperCase());
                b.innerHTML = callback_table.callbacks[callback_id]["commands"][i]["name"].substr(0, start);
                b.innerHTML += "<strong><span class='matching'>" + callback_table.callbacks[callback_id]["commands"][i]["name"].substr(start, val.length) + "</span></strong>";
                b.innerHTML += callback_table.callbacks[callback_id]["commands"][i]["name"].substr(val.length + start);
                /*insert a input field that will hold the current array item's value:*/
                b.innerHTML += "<input type='hidden' value='" + callback_table.callbacks[callback_id]["commands"][i]["name"] + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function () {
                    /*insert the value for the autocomplete text field:*/
                    callback_table.callbacks[callback_id]['input_field'] = this.getElementsByTagName("input")[0].value;
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
    inp.addEventListener("keydown", function (e) {
        let callback_id = this.id.split(":")[2];
        let x = document.getElementById(callback_id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode === 9) {
            try {
                //we want to close the autocomplete menu and fill in with the top-most element
                if (currentFocus === -1) {
                    let val = "";
                    for(let j = 0; j < x.length; j++){
                        if(callback_table.callbacks[callback_id]['input_field'].toLowerCase() === x[j].textContent.toLowerCase()){
                            val = x[j].textContent;
                            break;
                        }
                    }
                    if(val === ""){
                        val = x[0].textContent;
                    }
                    callback_table.callbacks[callback_id]['input_field'] = val;
                } else {
                    callback_table.callbacks[callback_id]['input_field'] = x[currentFocus].textContent;
                }
                e.preventDefault();
                closeAllLists("");
            } catch (error) {
                //there must not be any autocomplete stuff, so just let it go on
            }
        } else if (e.keyCode === 38 && x !== null) {
            //keycode UP arrow
            if (x.length > 0) {
                currentFocus--;
                addActive(x, callback_id);
                e.stopImmediatePropagation();
            }
        } else if (e.keyCode === 40 && x !== null) {
            //keycode DOWN arrow
            if (x.length > 0) {
                currentFocus++;
                addActive(x, callback_id);
                e.stopImmediatePropagation();
            }
        } else if (e.keyCode === 27 && x !== null) {
            closeAllLists();
        } else if (e.keyCode === 13 && x !== null && x.length > 0) {
            if (currentFocus === -1) {
                let val = "";
                for(let j = 0; j < x.length; j++){
                    if(callback_table.callbacks[callback_id]['input_field'].toLowerCase() === x[j].textContent.toLowerCase()){
                        val = x[j].textContent;
                        break;
                    }
                }
                if(val === ""){
                    val = x[0].textContent;
                }
                callback_table.callbacks[callback_id]['input_field'] = val;
                e.preventDefault();
                closeAllLists("");
                e.stopImmediatePropagation();
            } else {
                callback_table.callbacks[callback_id]['input_field'] = x[currentFocus].textContent;
                e.preventDefault();
                closeAllLists("");
                e.stopImmediatePropagation();
            }
        }
    });

    function addActive(x, callback_id) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
        callback_table.callbacks[callback_id]['input_field'] = x[currentFocus].getElementsByTagName("input")[0].value;
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

(function () {
    // hold onto the drop down menu
    let dropdownMenu;

    // and when you show it, move it to the body
    $(window).on('show.bs.dropdown', function (e) {

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
    $(window).on('hide.bs.dropdown', function (e) {
        $(e.target).append(dropdownMenu.detach());
        dropdownMenu.hide();
    });
})();