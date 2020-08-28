document.title = "Payload Types";
// #################### PAYLOADTYPE AND COMMAND SECTION ###############################
var payloadtypes = [];
var commandEdit_table = new Vue({
    el: '#commandEditTable',
    data: {
        version: 1,
        cmd: "",
        is_file_browse: false,
        is_process_list: false,
        is_download_file: false,
        is_remove_file: false,
        is_upload_file: false,
        is_agent_generator: false,
        is_exit: false,
        help_cmd: "",
        description: "",
        needs_admin: false,
        author: "",
        commands: [],
        selected_command: {}
    },
    methods: {},
    delimiters: ['[[', ']]']
});
var payloadtypes_table = new Vue({
    el: '#payloadtypes_table',
    data: {
        payloadtypes,
        current_payload: {},
        parameter_type_options: ['ChooseOne', 'String']
    },
    methods: {
        delete_payloadtype_button: function (p) {
            $('#payloadtypeDeleteModal').modal('show');
            $('#payloadtypeDeleteSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + p.id + "/", delete_payloadtype_callback, "DELETE", null);
            });
        },
        edit_commands_button: function (p) {
            commandEdit_table.commands = p.commands;
            //console.log(p);
            if (commandEdit_table.commands.length === 0) {
                return;
            }
            commandEdit_table.selected_command = Object.assign({}, commandEdit_table.commands[0]);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/commands/" + p.id + "/check/" + commandEdit_table.selected_command['cmd'], set_edit_command_info_callback, "GET", null);
            $('#commandEditModal').modal('show');
            $('#commandEditCmd').unbind('change').change(function () {
                // Populate the various parts of the modal on select changes
                let cmd = commandEdit_table.selected_command['cmd'];
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/commands/" + p.id + "/check/" + cmd, set_edit_command_info_callback, "GET", null);
            });
        },
        parameters_button: function (p) {
            this.current_payload = p;
            $('#payload-type-view').modal('show');
        }
    },
    delimiters: ['[[', ']]']
});

function set_edit_command_info_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            //console.log(data);
            commandEdit_table.description = data['description'];
            commandEdit_table.cmd = data['cmd'];
            commandEdit_table.help_cmd = data['help_cmd'];
            commandEdit_table.version = data['version'];
            commandEdit_table.needs_admin = data['needs_admin'];
            commandEdit_table.is_exit = data['is_exit'];
            commandEdit_table.is_file_browse = data['is_file_browse'];
            commandEdit_table.is_download_file = data['is_download_file'];
            commandEdit_table.is_process_list = data['is_process_list'];
            commandEdit_table.is_remove_file = data['is_remove_file'];
            commandEdit_table.is_upload_file = data['is_upload_file'];
            commandEdit_table.author = data['author'];
            set_edit_command_parameters(JSON.stringify(data['params']));
            set_edit_command_attack(JSON.stringify({'status': 'success', 'attack': data['attack']}));
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

var command_parameters = [];
var command_parameters_table = new Vue({
    el: '#edit_command_parameters_table',
    data: {
        command_parameters
    },
    methods: {},
    delimiters: ['[[', ']]']
});

function set_edit_command_parameters(response) {
    try {
        let data = JSON.parse(response);
        if ('status' in data) {
            alertTop("danger", "Error editing a command parameter: " + data['error']);
        } else {
            command_parameters_table.command_parameters = data;
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function set_edit_command_attack(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            edit_command_attack_table.add_attack_command = data['attack'];
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function delete_payloadtype_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            // we need to remove the corresponding payload type from the UI
            for (let i = 0; i < payloadtypes_table.payloadtypes.length; i++) {
                if (payloadtypes_table.payloadtypes[i]['ptype'] === data['ptype']) {
                    payloadtypes_table.payloadtypes.splice(i, 1);
                    return;
                }
            }
        } else {
            alertTop("danger", "Error deleting a payload type: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

var gotCommandData = false;

function startwebsocket_payloadtypes() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloadtypes');
    ws.onmessage = function (event) {
        if (event.data !== "") {
            let pdata = JSON.parse(event.data);
            //prep things for loading the transformation data
            for (let i = 0; i < payloadtypes_table.payloadtypes.length; i++) {
                if (payloadtypes_table.payloadtypes[i]['ptype'] === pdata['ptype']) {
                    // just updating data
                    Vue.set(payloadtypes_table.payloadtypes, i, Object.assign({}, payloadtypes_table.payloadtypes[i], pdata));
                    return;
                }
            }
            // if we get here, then we have a new payload type entry
            pdata['commands'] = [];
            payloadtypes_table.payloadtypes.push(pdata);
            payloadtypes_table.payloadtypes.sort((a, b) => (a.ptype > b.ptype) ? 1 : ((b.ptype > a.ptype) ? -1 : 0));
        } else {
            if (!gotCommandData) {
                gotCommandData = true;
                startwebsocket_commands();
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

startwebsocket_payloadtypes();

function startwebsocket_commands() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/commands');
    ws.onmessage = function (event) {
        if (event.data !== "") {
            let cdata = JSON.parse(event.data);
            // now add the command data to the appropriate payload type
            for (let i = 0; i < payloadtypes_table.payloadtypes.length; i++) {
                if (payloadtypes_table.payloadtypes[i]['ptype'] === cdata['payload_type']) {
                    // now that you have the right payloadtype, see if it has a commands set already created
                    if (!payloadtypes_table.payloadtypes[i]['commands_set']) {
                        // it doesn't have a set yet, so create one
                        payloadtypes_table.payloadtypes[i]['commands_set'] = new Set();
                    }
                    payloadtypes_table.payloadtypes[i]['commands_set'].add(cdata);
                    Vue.set(payloadtypes_table.payloadtypes[i], 'commands', Array.from(payloadtypes_table.payloadtypes[i]['commands_set']));
                    // once we add in our new command, resort the array
                    payloadtypes_table.payloadtypes[i]['commands'].sort((a, b) => (a.cmd > b.cmd) ? 1 : ((b.cmd > a.cmd) ? -1 : 0));
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

var edit_command_attack_table = new Vue({
    el: '#edit_command_attack_table',
    data: {
        add_attack_command: [],
        attackOptions: []
    },
    methods: {},
    delimiters: ['[[', ']]']
});

function command_attack_options_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            data['attack'].sort((a, b) => (a.t_num > b.t_num) ? 1 : ((b.t_num > a.t_num) ? -1 : 0));
            edit_command_attack_table.attackOptions = data['attack'];
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack/listing", command_attack_options_callback, "GET", null);

function container_heartbeat_check() {
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    for (let i = 0; i < payloadtypes_table.payloadtypes.length; i++) {
        let heartbeat = new Date(payloadtypes_table.payloadtypes[i].last_heartbeat);
        let difference = (now - heartbeat.getTime()) / 1000;
        if (difference < 30) {
            payloadtypes_table.payloadtypes[i]['container_running'] = true;
        } else {
            if (payloadtypes_table.payloadtypes[i]['container_running'] === true) {
                // if it's currently set to running, let's change it in the db that it's down
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + payloadtypes_table.payloadtypes[i]['id'], change_heartbeat_callback, "PUT", {"container_running": false});
            }
            payloadtypes_table.payloadtypes[i]['container_running'] = false;
        }
    }
}

function change_heartbeat_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== "success") {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

setInterval(container_heartbeat_check, 500);
