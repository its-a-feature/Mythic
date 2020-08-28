document.title = "Wrapper Creation";
var all_wrapper_data = {};
var profile_parameters_table = new Vue({
    el: '#payloadCreation',
    data: {
        selected_wrapper: " Select One...",
        wrapper_parameters: [],
        name: "",
        tag: "",
        wrapper_options: [],
        payload_options: [],
        selected_payload: {},
        pt_buttons: true,
        payload_buttons: false,
        create_buttons: false
    },
    methods: {
        move_to_payloads: function () {
            if (this.selected_wrapper !== " Select One...") {
                if (this.payload_options.length > 0) {
                    this.selected_payload = this.payload_options[0];
                    profile_parameters_table.$forceUpdate();
                } else {
                    this.selected_payload = {};
                }
                this.pt_buttons = false;
                this.payload_buttons = true;
                $('#payload-card-body').collapse('show');
                $('#c2-card-body').collapse('hide');
            } else {
                alertTop("warning", "Select a Wrapper Payload Type first", 1);
            }
        },
        move_from_payloads: function () {
            this.payload_buttons = false;
            this.pt_buttons = true;
            this.create_buttons = false;
            $('#commands-card-body').collapse('hide');
            $('#payload-card-body').collapse('hide');
            $('#c2-card-body').collapse('show');
        },
        move_to_submit: function () {
            this.create_buttons = true;
            this.payload_buttons = false;
        },
        submit_payload: function () {
            let data = {"payload_type": this.selected_wrapper, "c2_profiles": []};
            if (this.name !== "") {
                data['filename'] = this.name;
            }
            if (this.tag !== "") {
                data['tag'] = this.tag;
            }
            data['wrapped_payload'] = this.selected_payload.uuid;
            data['build_parameters'] = [];
            for (let i = 0; i < this.wrapper_parameters.length; i++) {
                data['build_parameters'].push({
                    "name": this.wrapper_parameters[i]['name'],
                    "value": this.wrapper_parameters[i]['value']
                });
            }
            alertTop("info", "Submitted creation request...", 1);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create", submit_payload_callback, "POST", data);
        },
        list_wrapped_types: function (wrapper) {
            for (const [key, value] of Object.entries(all_wrapper_data)) {
                if (key === wrapper) {
                    return value['wrapped'];
                }
            }
            return [];
        },
        payload_select_view: function (p) {
            let output = p.payload_type;
            output += " - " + p['file_id']['filename'];
            output += " - " + p.tag;
            return output;
        },
        passing_payload_requirements: function (val) {
            if (val.required === false) {
                return true
            }
            let regex = RegExp(val['verifier_regex']);
            return regex.test(val['value']);
        }
    },
    watch: {
        selected_wrapper: function (val) {
            if (val !== " Select One...") {
                //make a request out to the transforms api to get the creation transforms
                this.wrapper_parameters = Object.assign([], all_wrapper_data[val]['build_parameters']);
                for (const [key, value] of Object.entries(all_wrapper_data)) {
                    if (key === val) {
                        let data = [];
                        value['wrapped'].forEach((x) => {
                            data.push(x.wrapped);
                        });
                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/current_operation/bytypes", (response) => {
                            try {
                                let tdata = JSON.parse(response);
                                if (tdata['status'] === 'success') {
                                    //console.log(tdata);
                                    for (const [, info] of Object.entries(tdata['payloads'])) {
                                        info.forEach((x) => {
                                            profile_parameters_table.payload_options.push(x);
                                        });
                                    }
                                } else {
                                    alertTop("danger", tdata['error']);
                                }
                            } catch (error) {
                                alertTop("danger", "Session expired, please refresh");
                            }

                        }, "POST", {'ptypes': data});
                    }
                }
            }
        },
    },
    delimiters: ['[[', ']]']
});
$(document).unbind('ready').ready(function () {
    //initially populate the c2_profiles section with the available c2profiles for this operation
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes", (response) => {
        try {
            let data = JSON.parse(response);
            profile_parameters_table.wrapper_options = [' Select One...'];
            for (let i = 0; i < data['wrappers'].length; i++) {
                for (let j = 0; j < data['wrappers'][i]['build_parameters'].length; j++) {
                    if (data['wrappers'][i]['build_parameters'][j]['parameter_type'] === 'ChooseOne') {
                        data['wrappers'][i]['build_parameters'][j]['choices'] = data['wrappers'][i]['build_parameters'][j]['parameter'].split("\n");
                        data['wrappers'][i]['build_parameters'][j]['value'] = data['wrappers'][i]['build_parameters'][j]['choices'][0];
                    }
                }
                profile_parameters_table.wrapper_options.push(data['wrappers'][i].ptype);
                //save all of the information off into the global dictionary that we can reference later.
                all_wrapper_data[data['wrappers'][i].ptype] = data['wrappers'][i];
            }
            profile_parameters_table.wrapper_options.sort((a, b) => (b > a) ? -1 : ((a > b) ? 1 : 0));
        } catch (error) {
            console.log(error);
            alertTop("danger", "Session expired, please refresh");
        }
    }, "GET", null);
});

var global_uuids = {};

function submit_payload_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            clearTop();
            alertTop("info", "Wait here for a notification or go to the <a target='_blank' href=\"{{links.payload_management}}\" style='color:darkblue'> Payload Management Page</a> and wait for the final payload there", 0, "Agent " + data['uuid'] + " submitted to the build process...", false);
            global_uuids[data['uuid']] = false;  // indicate if we've seen the final success/failure message for this yet or not
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function startwebsocket_rabbitmq_build_finished() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloads/current_operation');
    ws.onmessage = function (event) {
        // sometimes we get teh messages too quickly and so we get the same data twice when querying the db
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            //console.log(event.data);
            let data = JSON.parse(event.data);
            if (global_uuids[data['uuid']] === false) {

                if (data['build_phase'] === "success") {
                    clearTop();
                    alertTop("success", "<b>Execution help:</b> " + data['build_message'] + "<br><b>UUID:</b> " + data['uuid']
                        + "<br><a class='btn btn-info' href='{{links.payload_management}}'>Manage Payload</a><a class='btn btn-info' href='{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/download/" + data['uuid'] + "'>Download Payload</a>", 0,
                        "Success! Your agent, " + data['file_id']['filename'] + ", was successfully built.", false);
                    global_uuids[data['uuid']] = true;
                } else if (data['build_phase'] === "error") {
                    clearTop();
                    alertTop("danger", data['build_message'], 0, "Uh oh, something went wrong.", true);
                    global_uuids[data['uuid']] = true;
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

startwebsocket_rabbitmq_build_finished();