document.title = "Files";
var files_div = new Vue({
    el: '#files_div',
    data: {
        hosts: {"uploads": [], "downloads": []}
    },
    methods: {
        delete_file: function (file_id) {
            alertTop("info", "deleting...", 1);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/" + file_id, delete_file_callback, "DELETE", null);
        },
        export_file_metadata: function (section) {
            download_from_memory(section + ".json", btoa(JSON.stringify(this.hosts[section])));
        },
        display_info: function (file) {
            file_info_div.file = file;
            $('#file_info_div').modal('show');
        },
        zip_selected_files: function () {
            let selected_files = [];
            for (let i = 0; i < files_div.hosts['downloads'].length; i++) {
                if (files_div.hosts['downloads'][i]['selected'] === true) {
                    selected_files.push(files_div.hosts['downloads'][i]['agent_file_id']);
                }
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/bulk", (response) => {
                let data = JSON.parse(response);
                if (data['status'] === 'success') {
                    alertTop("success", "Download your zip file on the Services page or here:<br><a class='btn btn-info' href='{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + data['file_id'] + "'>Download Zip</a>", 0, "Success!", false);
                }
            }, "POST", {'files': selected_files});
        },
        toggle_all: function () {
            for (let i = 0; i < files_div.hosts['downloads'].length; i++) {
                files_div.hosts['downloads'][i]['selected'] = !files_div.hosts['downloads'][i]['selected'];
            }
            files_div.$forceUpdate();
        }
    },
    delimiters: ['[[', ']]']
});

function delete_file_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== "success") {
            alertTop("danger", data['error']);
        } else {
            for (let i = 0; i < files_div.hosts['uploads'].length; i++) {
                if (files_div.hosts['uploads'][i]['id'] === data['id']) {
                    files_div.hosts['uploads'].splice(i, 1);
                    return;
                }
            }
            for (let i = 0; i < files_div.hosts['downloads'].length; i++) {
                if (files_div.hosts['downloads'][i]['id'] === data['id']) {
                    files_div.hosts['downloads'].splice(i, 1);
                    return;
                }
            }
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function startwebsocket_files() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/files/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let file = JSON.parse(event.data);
            //console.log(file);
            file['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + file['agent_file_id'];
            if (file.is_download_from_agent) {
                for (let i = 0; i < files_div.hosts['downloads'].length; i++) {
                    if (file['id'] === files_div.hosts['downloads'][i]['id']) {
                        if (file['deleted'] === true) {
                            files_div.hosts['downloads'].splice(i, 1);
                        } else {
                            Vue.set(files_div.hosts['downloads'], i, file);
                        }
                        files_div.$forceUpdate();
                        return;
                    }
                }
                // if we get here, we don't have the file, so add it
                files_div.hosts['downloads'].unshift(file);
                files_div.$forceUpdate();
            } else {
                file.upload = JSON.parse(file.upload);
                file['path'] = file['filename'];
                for (let i = 0; i < files_div.hosts['uploads'].length; i++) {
                    if (file['id'] === files_div.hosts['uploads'][i]['id']) {
                        if (file['deleted'] === true) {
                            files_div.hosts['uploads'].splice(i, 1);
                        } else {
                            Vue.set(files_div.hosts['uploads'], i, file);
                        }
                        files_div.$forceUpdate();
                        return;
                    }
                }
                // if we get here, we don't have the file, so add it
                files_div.hosts['uploads'].unshift(file);
                files_div.$forceUpdate();
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

startwebsocket_files();

var file_info_div = new Vue({
    el: '#file_info_div',
    delimiters: ['[[', ']]'],
    data: {
        file: {}
    }
});