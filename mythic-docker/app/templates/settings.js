document.title = "Settings";
var operators = [];
var operator = new Vue({
    el: '#page_heading',
    data: {
        current_operator: {}
    },
    methods: {
        change_time: function (o) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, update_operatorview_callback, "PUT", {"view_utc_time": o.view_utc_time});
        },
    },
    delimiters: ['[[', ']]']
});
var operators_table = new Vue({
    el: '#operators_table',
    data: {
        operators,
        current_operator: {},
        new_username: "",
        new_password_1: "",
        new_password_2: ""
    },
    delimiters: ['[[', ']]'],
    methods: {
        delete_operator_button: function (o) {
            delete_button(o);
        },
        change_admin_button: function (o) {
            if (o.id === 1) {
                alertTop("danger", "Cannot revoke admin status of default admin");
            } else {
                let data = {"admin": !o['admin']};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, update_operatorview_callback, "PUT", data);
            }
        },
        set_password_button: function (o) {
            password_button(o);
        },
        change_username_button: function (o) {
            username_button(o);
        },
        change_time: function (o) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, update_operatorview_callback, "PUT", {"view_utc_time": o.view_utc_time});
        },
        change_active_button: function (o) {
            let data = {"active": !o['active']};
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, update_operatorview_callback, "PUT", data);
        },
        change_config_button: function (o) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, get_config_button_callback, "GET", null);
            $('#operatorConfigModal').modal('show');
            $('#operatorConfigSubmit').unbind('click').click(function () {
                let config = {};
                for (let i = 0; i < operator_config.config.length; i++) {
                    config[operator_config.config[i]["key"]] = operator_config.config[i]["value"];
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, get_set_config_button_callback, "PUT", {"ui_config": JSON.stringify(config)});
            });
        },
        new_user_button: function () {
            this.new_username = "";
            this.new_password_1 = "";
            this.new_password_2 = "";
            $('#newOperatorModal').modal('show');
            $('#newOperatorSubmit').unbind('click').click(function () {
                if (operators_table.new_password_1 !== operators_table.new_password_2) {
                    alertTop("warning", "Passwords don't match");
                } else {
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/", (response) => {
                        try {
                            let data = JSON.parse(response);
                            if (data['status'] !== 'success') {
                                alertTop("warning", data['error']);
                            }
                        } catch (error) {
                            console.log(error.toString());
                            alertTop("danger", "Session expired, please refresh");
                        }
                    }, "POST", {'username': operators_table.new_username, 'password': operators_table.new_password_1});
                }
            });
        }
    }
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/me", (response) => {
    try {
        let data = JSON.parse(response);
        if ('id' in data) {
            operator.current_operator = data;
            operators_table.current_operator = data;
            if (data['admin']) {
                startwebsocket_operators();
                startwebsocket_updatedoperators();
            }
        } else {
            alertTop("warning", "Problem getting operator information");
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}, "GET", null);

function get_config_button_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            //operator_config.config = JSON.parse(data['ui_config']);
            let config_data = JSON.parse(data['ui_config']);
            operator_config.config = [];
            for (let key in config_data) {
                operator_config.config.push({"key": key, "value": config_data[key]});
            }
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session is expired, please refresh");
    }
}

function get_set_config_button_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            //operator_config.config = JSON.parse(data['ui_config']);
            location.reload(true);
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session is expired, please refresh");
    }
}

var operator_config = new Vue({
    el: '#operatorConfigModal',
    data: {
        config: []
    },
    methods: {
        add_key_config: function () {
            this.config.push({"key": "", "value": ""});
        },
        remove_key_config: function (key) {
            for (let i = 0; i < this.config.length; i++) {
                if (key === this.config[i]["key"]) {
                    this.config.splice(i, 1);
                }
            }
        },
        get_light_config: function () {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/config/light", get_static_config_button_callback, "GET", null);
        },
        get_dark_config: function () {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/config/dark", get_static_config_button_callback, "GET", null);
        }
    },
    delimiters: ['[[', ']]']
});

function get_static_config_button_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            delete data['status'];
            operator_config.config = [];
            let config_data = JSON.parse(data['config']);
            for (let key in config_data) {
                operator_config.config.push({"key": key, "value": config_data[key]});
            }
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function startwebsocket_operators() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/operators');
    ws.onmessage = function (event) {
        if (event.data !== "") {
            let odata = JSON.parse(event.data);
            operators.push(odata);
            operators.sort((a, b) => (a.username > b.username) ? 1 : ((b.username > a.username) ? -1 : 0));
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

function startwebsocket_updatedoperators() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedoperators');
    ws.onmessage = function (event) {
        if (event.data !== "") {
            let odata = JSON.parse(event.data);
            for (let i = 0; i < operators.length; i++) {
                if (operators[i].id === odata['id']) {
                    Vue.set(operators, i, odata);
                    break;
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

function username_button(op) {
    $('#operatorNewUsername').val("");
    $('#operatorUsernameModal').modal('show');
    $('#operatorUsernameSubmit').unbind('click').click(function () {
        let data = {};
        if ($('#operatorNewUsername').val() !== "") {
            data['username'] = $('#operatorNewUsername').val();
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.id, update_operatorview_callback, "PUT", data);
        } else {
            alertTop("danger", "Cannot change name to empty");
        }
    });
}

function password_button(op) {
    $('#operatorNewPassword1').val("");
    $('#operatorNewPassword2').val("");
    $('#operatorOldPassword').val("");
    $('#operatorPasswordModal').modal('show');
    $('#operatorPasswordSubmit').unbind('click').click(function () {
        let data = {};
        if (operator.current_operator['admin']) {
            data['old_password'] = "Empty";
        }
        if ($('#operatorNewPassword1').val() !== $('#operatorNewPassword2').val()) {
            alertTop("danger", "New passwords don't match!");
        } else {
            data['old_password'] = $('#operatorOldPassword').val();
            data['password'] = $('#operatorNewPassword1').val();
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.id, update_operator_callback, "PUT", data);
        }
    });
}
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function config_button(o) {
    operator_config.config = [];
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, get_config_button_callback, "GET", null);
    $('#operatorConfigModal').modal('show');
    $('#operatorConfigSubmit').unbind('click').click(function () {
        let config = {};
        for (let i = 0; i < operator_config.config.length; i++) {
            config[operator_config.config[i]["key"]] = operator_config.config[i]["value"];
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.id, get_set_config_button_callback, "PUT", {"ui_config": JSON.stringify(config)});
    });
}
/* eslint-enable no-unused-vars */
function delete_button(op) {
    $('#operatorDeleteModal').modal('show');
    $('#operatorDeleteSubmit').unbind('click').click(function () {
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.id, delete_operator_callback, "DELETE", null);
    });
}

function delete_operator_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            let i = 0;
            for (i = 0; i < operators.length; i++) {
                if (operators[i].username === data['username']) {
                    break;
                }
            }
            operators.splice(i, 1);
            if (operators.length === 0) {
                //there's nobody left, so go to logout page
                window.location = "{{http}}://{{links.server_ip}}:{{links.server_port}}/logout";
            }
        } else {
            //there was an error, so we should tell the user
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function update_operator_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            alertTop("success", "Password successfully changed");
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function update_operatorview_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            alertTop("success", "success");
            location.reload(true);
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

// ----------- APITOKEN SECTION -------------------
var apitoken_table = new Vue({
    el: '#apitokens_table',
    data: {
        tokens: []
    },
    methods: {
        delete_apitoken_button: function (t) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/apitokens/" + t.id, delete_token_callback, "DELETE", null);
        },
        toggle_active_button: function (t) {
            let data = {"active": !t.active}
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/apitokens/" + t.id, toggle_apitoken_callback, "PUT", data);
        },
        create_apitoken_button: function () {
            $('#apitokenCreateModal').modal('show');
            $('#apitokenCreateSubmit').unbind('click').click(function () {
                let data = {"token_type": $('#apitokenCreateTokenType').val()};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/apitokens/", create_apitoken_callback, "POST", data);
            });
        }
    },
    delimiters: ['[[', ']]']
});

function get_tokens() {
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/apitokens", get_tokens_callback, "GET", null);
}

get_tokens();

function get_tokens_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            apitoken_table.tokens = data['apitokens'];
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function delete_token_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            for (let i = 0; i < apitoken_table.tokens.length; i++) {
                if (apitoken_table.tokens[i].id === data['id']) {
                    apitoken_table.tokens.splice(i, 1);
                    return;
                }
            }
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function toggle_apitoken_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            for (let i = 0; i < apitoken_table.tokens.length; i++) {
                if (apitoken_table.tokens[i].id === data['id']) {
                    Vue.set(apitoken_table.tokens, i, data);
                    return;
                }
            }
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function create_apitoken_callback(response) {
    try {
        var data = JSON.parse(response);
        if (data['status'] === 'success') {
            Vue.set(apitoken_table.tokens, apitoken_table.tokens.length, data);
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}