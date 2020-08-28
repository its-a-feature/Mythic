document.title = "Operations Management";
var operations = [];
var operators_vue = new Vue({
    el: '#operationModifyModal',
    data: {
        operation_members: [],
        admin_options: [],
        admin: "",
        name: "",
        webhook: "",
        complete: false,
        view_options: ["operator", "developer", "spectator"]
    },
    delimiters: ['[[', ']]']
});
var operations_table = new Vue({
    el: '#operations_table',
    data: {
        operations,
        username: "",
        admin: false,
        current_operation: "",
        oid: ""
    },
    methods: {
        modify_button: function (o) {
            try {
                operators_vue.operation_members = [];
                operators_vue.admin_options = [];
                let potential_operators = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/"));
                for (let i = 0; i < potential_operators.length; i++) {
                    let mem_add = {
                        "username": potential_operators[i]['username'],
                        "selected": false,
                        "view_mode": "operator"
                    };
                    o.members.forEach((x) => {
                        if (x['username'] === mem_add['username']) {
                            mem_add['selected'] = true;
                            mem_add['view_mode'] = x['view_mode'];
                        }
                    });
                    operators_vue.admin_options.push(potential_operators[i]['username']);
                    operators_vue.operation_members.push(mem_add);
                }
                operators_vue.name = o.name;
                operators_vue.webhook = o.webhook;
                operators_vue.admin = o.admin;
                operators_vue.complete = o.complete;
                operators_vue.operation_members.sort((a, b) => (b.username > a.username) ? -1 : ((a.username > b.username) ? 1 : 0));
                $('#operationModifyModal').modal('show');
                $('#operationModifySubmit').unbind('click').click(function () {
                    let data = {};
                    if (operators_vue.admin !== o.admin) {
                        data['admin'] = operators_vue.admin;
                    }
                    data['webhook'] = operators_vue.webhook;
                    data['name'] = operators_vue.name;
                    data['complete'] = operators_vue.complete;
                    let add_members = [];
                    let remove_members = [];
                    for (let i = 0; i < operators_vue.operation_members.length; i++) {
                        let to_remove = false;
                        o.members.forEach((x) => {
                            if (x['username'] === operators_vue.operation_members[i]['username']) {
                                if (!operators_vue.operation_members[i]['selected']) {
                                    // we were selected and now aren't
                                    to_remove = true;
                                }
                            }
                        });
                        if (to_remove) {
                            remove_members.push(operators_vue.operation_members[i]['username']);
                        } else {
                            add_members.push({
                                "username": operators_vue.operation_members[i]['username'],
                                "view_mode": operators_vue.operation_members[i]['view_mode']
                            });
                        }
                    }
                    if (add_members.length > 0) {
                        data['add_members'] = add_members;
                    }
                    if (remove_members.length > 0) {
                        data['remove_members'] = remove_members;
                    }
                    //console.log(data);
                    // make sure the admin didn't get added to the 'remove-users' group
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.id, modify_operation, "PUT", data);
                });
            } catch (error) {
                alertTop("danger", "Session expired, please refresh");
            }
        },
        new_operation_button: function () {
            try {
                operators_vue.operation_members = [];
                operators_vue.admin_options = [];
                let potential_operators = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/"));
                for (let i = 0; i < potential_operators.length; i++) {
                    let mem_add = {
                        "username": potential_operators[i]['username'],
                        "selected": false,
                        "view_mode": "operator"
                    };
                    operators_vue.admin_options.push(potential_operators[i]['username']);
                    operators_vue.operation_members.push(mem_add);
                }
                operators_vue.complete = false;
                operators_vue.admin = operators_vue.admin_options[0];
                operators_vue.webhook = "";
                operators_vue.name = "";
                $('#operationModifyModal').modal('show');
                $('#operationModifySubmit').unbind('click').click(function () {
                    let data = {};
                    data['admin'] = operators_vue.admin;
                    data['webhook'] = operators_vue.webhook;
                    data['name'] = operators_vue.name;
                    data['members'] = [];
                    for (let i = 0; i < operators_vue.operation_members.length; i++) {
                        if (operators_vue.operation_members[i]['selected']) {
                            data['members'].push({
                                "username": operators_vue.operation_members[i]['name'],
                                "view_mode": operators_vue.operation_members[i]['view_mode']
                            });
                        }
                    }
                    //console.log(data);
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", (response) => {
                        try {
                            let rdata = JSON.parse(response);
                            if (rdata['status'] === 'error') {
                                alertTop("warning", rdata['error'], 5);
                            } else {
                                alertTop("success", "Successfully created operation");
                                operations_table.operations.push(rdata);
                            }
                        } catch (error) {
                            alertTop("danger", "Session expired, please refresh");
                        }
                    }, "POST", data);
                });
            } catch (error) {
                alertTop("danger", "Session expired, please refresh");
            }
        },
        modify_acls_button: function (o) {
            modify_user_acls.members = o.members;
            $('#operationModifyACLsModal').modal('show');
            $('#operationModifyACLsSubmit').unbind('click').click(function () {
                let data = {'add_disabled_commands': []};
                modify_user_acls.members.forEach(function (x) {
                    if (x.base_disabled_commands === "None") {
                        x.base_disabled_commands = undefined
                    }
                    data['add_disabled_commands'].push({
                        "username": x.username,
                        'base_disabled_commands': x.base_disabled_commands
                    });
                });
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.id, modify_acls_callback, "PUT", data);
            });
        },
        set_current_operation: function (o) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + operations_table.oid, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        operations_table.current_operation = data['current_operation'];
                        window.location.reload();
                    } else {
                        alertTop("danger", "Failed to fetch the current operator");
                    }
                } catch (error) {
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "PUT", {"current_operation": o.name});
        },
        is_member: function (o, name) {
            for (let i = 0; i < o.members.length; i++) {
                if (o.members[i]['username'] === name) {
                    return true;
                }
            }
            return false;
        }
    },
    delimiters: ['[[', ']]']
});

function modify_acls_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            alertTop("success", "Successfully Updated", 1);
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function modify_operation(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            for (let i = 0; i < operations.length; i++) {
                //console.log(data);
                if (operations[i]['id'] === data['id']) {
                    Vue.set(operations_table.operations, i, data);
                }
            }
            operations_table.operations.sort((a, b) => (b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
            operations_table.$forceUpdate();
            alertTop("success", "Successfully updated");
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/me", (response) => {
    try {
        let data = JSON.parse(response);
        if ('username' in data) {
            operations_table.username = data['username'];
            operations_table.admin = data['admin'];
            operations_table.current_operation = data['current_operation'];
            operations_table.oid = data['id'];
        } else {
            alertTop("danger", "Failed to fetch the current operator");
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}, "GET", null);

function get_operations() {
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", get_operations_callback, "GET", null);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/commands/", get_commands_callback, "GET", null);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profiles", get_disabled_commands_profiles_response, "GET", null);
}

function get_operations_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            for (let i = 0; i < data['output'].length; i++) {
                Vue.set(operations_table.operations, i, data['output'][i]);
            }
            operations_table.operations.sort((a, b) => (b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        console.log(response);
        alertTop("danger", "Session expired, please refresh");
    }
}

function get_disabled_commands_profiles_response(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            let profiles = [];
            let i = 0;
            modify_user_acls.denied_command_profiles = [];
            Object.keys(data['disabled_command_profiles']).forEach(function (x) {
                let object_instance = {"name": x, "id": i, "values": data['disabled_command_profiles'][x]};
                profiles.push(object_instance);
                modify_user_acls.denied_command_profiles.push(x);
                i++;
            });
            view_acls.disabled_profiles = profiles;
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function get_commands_callback(response) {
    try {
        let data = JSON.parse(response);
        for (let i = 0; i < data.length; i++) {
            if (!Object.prototype.hasOwnProperty.call(create_acls.command_options, data[i]['payload_type'])) {
                create_acls.command_options[data[i]['payload_type']] = [];
            }
            data[i]['disabled'] = false;
            create_acls.command_options[data[i]['payload_type']].push(data[i]);
        }
        Object.keys(create_acls.command_options).forEach(function (x) {
            create_acls.command_options[x].sort((a, b) => (b.cmd > a.cmd) ? -1 : ((a.cmd > b.cmd) ? 1 : 0));
        });
        create_acls.selected_commands = create_acls.command_options;
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

get_operations();
var modify_user_acls = new Vue({
    el: '#operationModifyACLsModal',
    data: {
        members: [],
        denied_command_profiles: []
    },
    delimiters: ['[[', ']]']
});
var create_acls = new Vue({
    el: '#operationCreateACLsModal',
    data: {
        command_options: {},
        selected_commands: {},
        name: ""
    },
    delimiters: ['[[', ']]']
});
var view_acls = new Vue({
    el: '#view_acls',
    data: {
        disabled_profiles: []
    },
    methods: {
        delete_instance: function (instance) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profiles/" + btoa(instance.name), delete_acl_response, "DELETE", null);
        },
        edit_profile: function (instance) {
            // set all of the current disable flags to match the instance in the create_acls Vue instance
            create_acls.name = instance.name;
            // reset all to not disabled
            Object.keys(create_acls.selected_commands).forEach(function (x) {
                //looping through payload types, x is payload type name
                create_acls.selected_commands[x].forEach(function (y) {
                    y.disabled = false;
                });
            });
            // mark the instances one as disabled
            Object.keys(instance['values']).forEach(function (x) {
                //looping through payload types, x is payload type name
                instance['values'][x].forEach(function (y) {
                    create_acls.selected_commands[x].forEach(function (z) {
                        if (z.cmd === y.command) {
                            z.disabled = true;
                        }
                    });
                });
            });
            $('#operationCreateACLsModal').modal('show');
            $('#operationCreateACLsSubmit').unbind('click').click(function () {
                let data = {};
                data[create_acls.name] = {};
                for (const [key, value] of Object.entries(create_acls.selected_commands)) {
                    // key will be a payload type
                    for (let i = 0; i < value.length; i++) {
                        //found a thing we need to add
                        if (!Object.prototype.hasOwnProperty.call(data[create_acls.name], key)) {
                            data[create_acls.name][key] = [];
                        }
                        if (value[i]['disabled']) {
                            data[create_acls.name][key].push(value[i]['cmd']);
                        }
                    }
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profile", create_acl_response, "PUT", data);

            });
        },
        display_list: function (values) {
            let list = [];
            values.forEach((x) => {
                list.push(x.command);
            });
            return list.sort().join(", ");
        }
    },
    delimiters: ['[[', ']]']
});

function delete_acl_response(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'error') {
            alertTop("danger", data['error']);
        } else {
            for (let i = 0; i < view_acls.disabled_profiles.length; i++) {
                if (data['name'] === view_acls.disabled_profiles[i]['name']) {
                    view_acls.disabled_profiles.splice(i, 1);
                    break;
                }
            }
            for (let i = 0; i < modify_user_acls.denied_command_profiles.length; i++) {
                if (data['name'] === modify_user_acls.denied_command_profiles[i]) {
                    modify_user_acls.denied_command_profiles.splice(i, 1);
                    return;
                }
            }
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function new_acl_button() {
    create_acls.name = "";
    // reset all to not disabled
    Object.keys(create_acls.selected_commands).forEach(function (x) {
        //looping through payload types, x is payload type name
        create_acls.selected_commands[x].forEach(function (y) {
            y.disabled = false;
        });
    });
    $('#operationCreateACLsModal').modal('show');
    $('#operationCreateACLsSubmit').unbind('click').click(function () {
        let data = {};
        data[create_acls.name] = {};
        for (const [key, value] of Object.entries(create_acls.selected_commands)) {
            // key will be a payload type
            for (let i = 0; i < value.length; i++) {
                if (value[i]['disabled']) {
                    //found a thing we need to add
                    if (!Object.prototype.hasOwnProperty.call(data[create_acls.name], key)) {
                        data[create_acls.name][key] = [];
                    }
                    data[create_acls.name][key].push(value[i]['cmd']);
                }
            }
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profile", create_acl_response, "POST", data);
    });
}
/* eslint-enable no-unused-vars */
function create_acl_response(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profiles", get_disabled_commands_profiles_response, "GET", null);
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}