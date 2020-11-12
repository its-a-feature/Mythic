document.title = "Payloads";
// ############# PAYLOADS SECTION ###############################
var payloads = []; //all services data
var payloads_table = new Vue({
    el: '#payloads_table',
    data: {
        payloads,
        view_auto_generated: false
    },
    methods: {
        delete_button: function (p) {
            $('#payloadDeleteModal').modal('show');
            $('#payloadDeleteSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/" + p.uuid, delete_callback, "DELETE", null);
            });
        },
        update_callback_alert: function (p) {
            //console.log("called update_callback_alert");
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/" + p.uuid, function (response) {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] !== 'success') {
                        alertTop("danger", data['error']);
                    } else {
                        alertTop("success", "Alerting changed");
                    }
                } catch (error) {
                    alertTop("danger", "Session expired, refresh");
                }
            }, "PUT", {"callback_alert": !p.callback_alert});
        },
        show_parameters_button: function (p, build_message) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/" + p.uuid, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === "success") {
                        if (!build_message) {
                            console.log(data);
                            //Vue.set(payload_config_vue.config, "wrapped", false);
                            data["commands"].sort((a, b) => (a.cmd > b.cmd) ? 1 : ((b.cmd > a.cmd) ? -1 : 0));
                            for(const [k,v] of Object.entries(data["c2_profiles"])){
                                data["c2_profiles"][k].sort((a, b) => (a.description > b.description) ? 1 : ((b.description > a.description) ? -1 : 0));
                            }
                            Vue.set(payload_config_vue.config, "file_id", data['file_id']);
                            Vue.set(payload_config_vue.config, "commands", data['commands']);
                            Vue.set(payload_config_vue.config, "c2_profiles", data['c2_profiles']);
                            Vue.set(payload_config_vue.config, "build_message", data['build_message']);
                            Vue.set(payload_config_vue.config, "build_parameters", data['build_parameters']);
                            Vue.set(payload_config_vue.config, "uuid", p.uuid);
                            Vue.set(payload_config_vue.config, "wrapped", false);
                            if ('wrapped' in data) {
                                Vue.set(payload_config_vue.config, "wrapped", data['wrapped']);
                                Vue.set(payload_config_vue.config, "commands", data['wrapped']['commands']);
                                Vue.set(payload_config_vue.config, "c2_profiles", data['wrapped']['c2_profiles']);
                            }
                            $('#payloadConfigModal').modal('show');
                        } else {
                            $('#buildStatus').text(data['build_message']);
                            $('#payloadBuildStatusModal').modal('show');
                        }
                    } else {
                        alertTop("danger", data['error']);
                    }
                } catch (error) {
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "GET", null);

        },
        register_manual_callback: function (p) {
            register_new_callback_vue.reset();
            $('#payloadRegisterCallbackModal').modal('show');
            $('#payloadRegisterCallbackSubmit').unbind('click').click(function () {
                let data = register_new_callback_vue.get_json();
                data['uuid'] = p.uuid;
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/", function (response) {
                    try {
                        data = JSON.parse(response);
                    } catch (error) {
                        alertTop("danger", "Session expired, refresh");
                    }
                    if (data['status'] !== 'success') {
                        alertTop("danger", data['error']);
                    } else {
                        alertTop("success", "Registered new callback based on that data");
                    }
                }, "POST", data);
            });
        },
        edit_filename: function (p) {
            edit_payload_vue.header_message = "Edit Filename";
            edit_payload_vue.edit_value = p['file_id']['filename'];
            $('#payloadEditModal').modal('show');

            $('#payloadEditSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/" + p.uuid, function (response) {
                    try {
                        let data = JSON.parse(response);
                        if (data['status'] !== 'success') {
                            alertTop("danger", data['error']);
                        } else {
                            alertTop("success", "Alerting changed");
                            p['file_id']['filename'] = data['file_id']['filename']
                            payloads_table.$forceUpdate();
                        }
                    } catch (error) {
                        alertTop("danger", "Session expired, refresh");
                    }

                }, "PUT", {"filename": edit_payload_vue.edit_value});
            });
        },
        edit_description: function (p) {
            edit_payload_vue.header_message = "Edit Description";
            edit_payload_vue.edit_value = p['tag'];
            $('#payloadEditModal').modal('show');
            $('#payloadEditSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/" + p.uuid, function (response) {
                    try {
                        let data = JSON.parse(response);
                        if (data['status'] !== 'success') {
                            alertTop("danger", data['error']);
                        } else {
                            alertTop("success", "Alerting changed");
                            p['tag'] = data['tag']
                            payloads_table.$forceUpdate();
                        }
                    } catch (error) {
                        alertTop("danger", "Session expired, refresh");
                    }

                }, "PUT", {"description": edit_payload_vue.edit_value});
            });
        },
        toggle_auto_generated: function(){
            this.view_auto_generated = !this.view_auto_generated;
        }
    },
    delimiters: ['[[', ']]']
});
var edit_payload_vue = new Vue({
    el: '#payloadEditModal',
    data: {
        header_message: "",
        edit_value: ""
    },
    delimiters: ['[[', ']]']
});
$('#payloadEditModal').on('shown.bs.modal', function () {
    $('#payloadEdit').focus();
});
// register the select all for deleting
$('#selectAllForDelete').unbind('click').click(function () {
    for (let i = 0; i < payloads_table.payloads.length; i++) {
        payloads_table.payloads[i]['checked'] = $('#selectAllForDelete').is(":checked");
    }

});
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function delete_selected_function() {
    $('#payloadDeleteModal').modal('show');
    $('#payloadDeleteSubmit').unbind('click').click(function () {
        let data = {'payloads': []};
        for (let i = 0; i < payloads_table.payloads.length; i++) {
            if (payloads_table.payloads[i]['checked']) {
                data['payloads'].push({'uuid': payloads_table.payloads[i]['uuid']})
            }
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/delete_bulk", delete_selected_callback, "POST", data);
    });
}
/* eslint-enable no-unused-vars */
function delete_selected_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'error') {
            alertTop("danger", "<b>Error</b>: " + JSON.stringify(data['error'], null, 2));
        }
        let payloads_to_delete = Object.keys(data['successes']);
        for (let i = 0; i < payloads_to_delete.length; i++) {
            for (let j = 0; j < payloads_table.payloads.length; j++) {
                if (payloads_table.payloads[j]['uuid'] === payloads_to_delete[i]) {
                    payloads_table.payloads.splice(j, 1);
                }
            }
        }
        $('#selectAllForDelete').prop("checked", false);
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function delete_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            for (let i = 0; i < payloads_table.payloads.length; i++) {
                if (payloads_table.payloads[i].uuid === data['uuid']) {
                    payloads_table.payloads.splice(i, 1);
                    break;
                }
            }
        } else {
            //there was an error, so we should tell the user
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

var payload_config_vue = new Vue({
    el: '#payloadConfigModal',
    data: {
        config: {}
    },
    delimiters: ['[[', ']]']
});
var register_new_callback_vue = new Vue({
    el: '#payloadRegisterCallbackModal',
    data: {
        host: "",
        user: "",
        ip: "",
        domain: "",
        os: "",
        architecture: "",
        pid: 0,
        extra_info: "",
        external_ip: "",
        integrity_level: 2
    },
    methods: {
        reset: function () {
            this.host = "";
            this.user = "";
            this.ip = "";
            this.domain = "";
            this.os = "";
            this.architecture = "";
            this.pid = 0;
            this.external_ip = "";
            this.extra_info = "";
            this.integrity_level = 2;
        },
        get_json: function () {
            return {
                "host": this.host,
                "user": this.user,
                "ip": this.ip,
                "domain": this.domain,
                "os": this.os,
                "architecture": this.architecture,
                "pid": this.pid,
                "external_ip": this.external_ip,
                "extra_info": this.extra_info,
                "integrity_level": this.integrity_level
            };
        }
    },
    delimiters: ['[[', ']]']
})

function startwebsocket_payloads() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloads/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let pdata = JSON.parse(event.data);
            if (pdata['deleted'] === false) {
                console.log(pdata);
                for (let i = 0; i < payloads_table.payloads.length; i++) {
                    if (pdata['id'] === payloads_table.payloads[i]['id']) {
                        //just update the data
                        if (pdata['auto_generated']) {
                            payloads_table.payloads.splice(i, 1);
                            payloads_table.$forceUpdate();
                            return;
                        }
                        Vue.set(payloads_table.payloads, i, Object.assign({}, payloads_table.payloads[i], pdata));
                        payloads_table.$forceUpdate();
                        return;
                    }
                }
                pdata['checked'] = false; //add in this data to track if an agent is checked for deletion
                payloads_table.payloads.push(pdata);
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

startwebsocket_payloads();