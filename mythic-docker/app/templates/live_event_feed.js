document.title = "Event Feed";
var live_feed = new Vue({
    el: '#feed',
    delimiters: ['[[', ']]'],
    data: {
        events: [],
        filter: "",
        input_field: "",
        level_options: ["info", "warning"],
        level: "info"
    },
    methods: {
        apply_filter: function (e) {
            if (this.filter.includes(":")) {
                let pieces = this.filter.split(":");
                if (pieces[0].toLowerCase() in e) {
                    return e[pieces[0].toLowerCase()].toString().includes(pieces[1]);
                } else {
                    return false;
                }
            } else {
                return true;
            }
        },
        entry_color: function (e) {
            if (e['level'] === 'warning' && !e['resolved']) {
                return 'background-color:indianred;white-space: nowrap; width:100%';
            }
            if (e['level'] === 'warning' && e['resolved']) {
                return 'background-color:darkseagreen;white-space: nowrap; width:100%'
            }
            if (e['operator'] === 'Mythic') {
                return 'color:cornflowerblue;white-space: nowrap; width:100%';
            }
            return 'white-space:nowrap;width:100%';
        },
        send_message: function (e) {
            if (e.keyCode === 13 && e.shiftKey) {
                return;
            }
            e.preventDefault();
            let data = {'message': this.input_field, 'level': this.level};
            this.input_field = "";
            if (this.level !== "info") {
                this.level = "info";
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/", (response) => {
                try {
                    let r = JSON.parse(response);
                    if (r['status'] === 'error') {
                        alertTop("warning", r['error']);
                    }
                } catch (error) {
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", data);

        },
        edit_message: function (data) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/" + data.id, (response) => {
                try {
                    let r = JSON.parse(response);
                    if (r['status'] === 'error') {
                        alertTop("warning", r['error']);
                    }
                } catch (error) {
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "PUT", {"message": data['message']});
        },
        toggle_resolved: function (data) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/" + data.id, (response) => {
                try {
                    let r = JSON.parse(response);
                    if (r['status'] === 'error') {
                        alertTop("warning", r['error']);
                    }
                } catch (error) {
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "PUT", {"resolved": !data['resolved']});
        },
        message_rows: function (msg) {
            return (msg.match(/\n/g) || '').length + 1
        },
        delete_in_view: function () {
            let messages = [];
            for (let i = 0; i < this.events.length; i++) {
                if (this.apply_filter(this.events[i])) {
                    messages.push(this.events[i]['id']);
                }
            }
            if (messages.length > 0) {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/delete", (response) => {
                    try {
                        let r = JSON.parse(response);
                        if (r['status'] === 'error') {
                            alertTop("warning", r['error']);
                        }
                    } catch (error) {
                        console.log(error.toString());
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", {"messages": messages});
            } else {
                alertTop("warning", "No matching messages to remove");
            }
        },
        delete_message: function (data) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/delete", (response) => {
                try {
                    let r = JSON.parse(response);
                    if (r['status'] === 'error') {
                        alertTop("warning", r['error']);
                    }
                } catch (error) {
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {"messages": [data.id]});
        }
    }
});

function startwebsocket_events_list() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/events/current_operation');
    let bulk_done = false;
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            if (bulk_done) {
                for (let i = 0; i < live_feed.events.length; i++) {
                    if (live_feed.events[i]['id'] === data['id']) {
                        if (data['deleted']) {
                            live_feed.events.splice(i, 1);
                        } else {
                            live_feed.events[i] = data;
                            live_feed.$forceUpdate();
                        }
                        return;
                    }
                }
                live_feed.events.push(data);
            } else {
                live_feed.events = data;
            }
            live_feed.events.sort((a, b) => (b.id > a.id) ? -1 : ((a.id > b.id) ? 1 : 0));
            Vue.nextTick().then(function () {
                $("#feed_table").scrollTop($("#feed_table")[0].scrollHeight);
            });
        } else {
            bulk_done = true;
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_events_list();