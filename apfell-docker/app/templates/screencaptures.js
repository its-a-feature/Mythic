var finished_callbacks = false;
var finished_newcallbacks = false;
var screencapture_div = new Vue({
    el: '#screencapture_div',
    data: {
        callbacks: {}
    },
    methods: {
        toggle_image: function(image){
            let img = document.getElementById("image" + image.id).nextElementSibling;
            if (img.style.display === "") {
                //hide image
                img.style.display = "none";
                img.src = '#';
            } else {
                //display image
                if (!image['complete']){
                    alertTop("warning", "Image not done downloading from host. Apfell has " + image.chunks_received + " out of " + image.total_chunks + " total chunks.", 2);
                }
                img.style.display = "";
                img.src = image['remote_path'];
            }
        }
    },
    computed: {
        screenshots_exist: function(){
            for(let i in this.callbacks){
                if(this.callbacks[i]['screencaptures'].length > 0){return true;}
            }
            return false;
        }
    },
    delimiters: ['[[',']]']
});
function startwebsocket_callbacks(){
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    alertTop("success", "Loading...");
    // in the case where we have deleted tasks for files, we need some place to store them
    Vue.set(screencapture_div.callbacks, 0, {'screencaptures': [], "display": "TASK DELETED"})
    ws.onmessage = function(event){
        if (event.data !== ""){
            let cb = JSON.parse(event.data);
            if (cb.hasOwnProperty('operator')){
                if (cb['operator'] === "null"){
                    delete cb.operator;
                }
                else{
                    let op = cb['operator'].slice(0);
                    delete cb.operator;
                    cb['operator'] = op;
                }
            }
            cb['screencaptures'] = [];
            cb['display'] = cb['user'] + "@" + cb['host'] + "(" + cb['pid'] + ")";
            Vue.set(screencapture_div.callbacks, cb['id'], cb);
        }
        else{
            if(finished_callbacks === false){
                startwebsocket_newscreenshots();
                finished_callbacks = true;
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        //alertTop("danger", "Socket closed, please refresh");
    };
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    };
    ws.onopen = function(event){
        //console.debug("opened");
    }
}
function startwebsocket_newscreenshots(){
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/screenshots');
    ws.onmessage = function(event){
        if (event.data !== ""){
            let screencapture = JSON.parse(event.data);
            screencapture['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + screencapture['id'];
            Vue.set(screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'], screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'].length, screencapture);
        }
        else{
            if(finished_newcallbacks === false){
                startwebsocket_updatedscreenshots();
                finished_newcallbacks = true;
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        alertTop("danger", "Socket closed, please refresh");
    };
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    };
    ws.onopen = function(event){
        //console.debug("opened");
    }
}
function startwebsocket_updatedscreenshots(){
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updated_screenshots');
    ws.onmessage = function(event){
        if (event.data !== ""){
            let screencapture = JSON.parse(event.data);
            screencapture['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + screencapture['id'];
            for(let i = 0; i < screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'].length; i++){
                if(screencapture['id'] === screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'][i]['id']){
                    Vue.set(screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'], i, screencapture);
                    return;
                }
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        //alertTop("danger", "Socket closed, please refresh");
    };
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    };
    ws.onopen = function(event){
        //console.debug("opened");
    }
}
startwebsocket_callbacks();