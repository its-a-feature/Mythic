document.title = "Screenshots";
var finished_newcallbacks = false;
var screencapture_div = new Vue({
    el: '#screencapture_div',
    data: {
        screencaptures: []
    },
    methods: {
        toggle_image: function (image) {
            let img = document.getElementById("image_display");
            if (!image['complete']) {
                alertTop("warning", "Image not done downloading from host. Apfell has " + image.chunks_received + " out of " + image.total_chunks + " total chunks.", 2);
            }
            img.style.display = "";
            img.src = image['remote_path'] + "?cache=" + String(image.chunks_received) + String(image.total_chunks);
            $('#image_modal').modal('show');
        }
    },
    delimiters: ['[[', ']]']
});

function startwebsocket_newscreenshots() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/screenshots');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let screencapture = JSON.parse(event.data);
            screencapture['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + screencapture['agent_file_id'];
            screencapture_div.screencaptures.unshift(screencapture); //add to the beginning
        } else {
            if (finished_newcallbacks === false) {
                startwebsocket_updatedscreenshots();
                finished_newcallbacks = true;
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

function startwebsocket_updatedscreenshots() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updated_screenshots');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let screencapture = JSON.parse(event.data);
            screencapture['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + screencapture['agent_file_id'];
            for (let i = 0; i < screencapture_div.screencaptures.length; i++) {
                if (screencapture['id'] === screencapture_div.screencaptures[i]['id']) {
                    Vue.set(screencapture_div.screencaptures, i, screencapture);
                    return;
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

startwebsocket_newscreenshots();