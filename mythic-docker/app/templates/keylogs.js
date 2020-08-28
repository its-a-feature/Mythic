document.title = "Keylogs";
var keylog = new Vue({
    el: '#keylog_div',
    delimiters: ['[[', ']]'],
    data: {
        keylogs: {},
        grouping: "host",
        subgrouping: "user",
        search_data: ""
    },
    methods: {
        toggle_times: function (window) {
            window['times'] = !window['times'];
            this.$forceUpdate();
        },
        clear_badges: function (window) {
            window['apfell_badges'] = 0;
            this.$forceUpdate();
        },
        group_badges: function (group) {
            let total = 0;
            for (let i in group) {
                for (let j in group[i]) {
                    total += group[i][j]['apfell_badges'];
                }
            }
            return total;
        },
        subgroup_badges: function (subgroup) {
            let total = 0;
            for (let i in subgroup) {
                total += subgroup[i]['apfell_badges'];
            }
            return total;
        },
        collapse_all: function () {
            $('.collapse.show').removeClass("show");
        },
        expand_all: function () {
            $('.collapse').addClass("show");
        },
        search: function () {
            this.collapse_all();
            alertTop("info", "Searching...");
            let group = 0;
            let subgroup = 0;
            let window = 0;
            for (let i in this.keylogs) { // i is group
                for (let j in this.keylogs[i]) { // j is subgroup
                    for (let k in this.keylogs[i][j]) { // k is window titles
                        let combo = Object.keys(this.keylogs[i][j][k]['keylogs']).map(function (x) {
                            return [keylog.keylogs[i][j][k]['keylogs'][x]['keystrokes']];
                        }).join('');
                        if (combo.includes(this.search_data)) {
                            $('#group' + group + 'subgroup' + subgroup + 'window' + window).addClass("show");
                            $('#group' + group + 'subgroup' + subgroup).addClass("show");
                            $('#group' + group).addClass("show");
                        }
                        window += 1;
                    }
                    subgroup += 1;
                    window = 0;
                }
                subgroup = 0;
                window = 0;
                group += 1;
            }
        }
    },
    nextTick: function () {
        this.$forceUpdate();
    }
});

function host_window() {
    let data = {"grouping": "host"};
    alertTop("info", "Getting keylogs...");
    get_keylogging(data);
}

host_window();
/* eslint-disable no-unused-vars */

// this is called via Vue from the HTML code
function user_window() {
    let data = {"grouping": "user"};
    alertTop("info", "Getting keylogs...");
    get_keylogging(data);
}

/* eslint-enable no-unused-vars */
function get_keylogging(data) {
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/current_operation", keylog_callback, "POST", data);
}

function keylog_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            //console.log(data['keylogs']);
            keylog.grouping = data['grouping'];
            if (keylog.grouping === "host") {
                keylog.subgrouping = "user";
            } else {
                keylog.subgrouping = "host";
            }
            for (let i in data['keylogs']) {
                for (let j in data['keylogs'][i]) {
                    for (let k in data['keylogs'][i][j]) {
                        // data['keylogs'][i][j][k] should be the window
                        data['keylogs'][i][j][k]['apfell_badges'] = 0;
                        data['keylogs'][i][j][k]['times'] = false;
                    }
                }
            }
            keylog.keylogs = data['keylogs'];
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function startwebsocket_newkeylogs() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/keylogs/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let k = JSON.parse(event.data);
            let key_stroke_alert = k['keystrokes'];
            let group = "";
            let group2 = "";
            let window = k['window'];
            if (keylog.grouping === "host") {
                group = k['host'];
                group2 = k['user'];
            } else {
                group = k['user'];
                group2 = k['host'];
            }
            alertTop("success", key_stroke_alert, 4, "New Keylog from " + k['task']);
            //console.log(rsp);
            if (group in keylog.keylogs) {
                if (group2 in keylog.keylogs[group]) {
                    if (window in keylog.keylogs[group][group2]) {
                        keylog.keylogs[group][group2][window]['keylogs'].push(k);
                        if (!Object.prototype.hasOwnProperty.call(keylog.keylogs[group][group2][window], 'apfell_badges')) {
                            keylog.keylogs[group][group2][window]['apfell_badges'] = 0;
                        }
                        keylog.keylogs[group][group2][window]['apfell_badges'] += 1;
                    } else {
                        keylog.keylogs[group][group2][window] = {"apfell_badges": 1, "times": false, "keylogs": [k]};
                    }
                } else {
                    keylog.keylogs[group][group2] = {window: {"apfell_badges": 1, "times": false, "keylogs": [k]}};
                }
            } else {
                keylog.keylogs[group] = {group2: {window: {"apfell_badges": 1, "times": false, "keylogs": [k]}}};
            }
            keylog.$forceUpdate();

        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_newkeylogs();