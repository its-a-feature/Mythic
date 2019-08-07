var callbacks = {};
var finished_callbacks = false;
var finished_newcallbacks = false;
var screencapture_div = new Vue({
    el: '#screencapture_div',
    data: {
        callbacks
    },
    methods: {
        toggle_image: function(image){
            var img = document.getElementById("image" + image.id).nextElementSibling;
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
            for(i in this.callbacks){
                if(this.callbacks[i]['screencaptures'].length > 0){return true;}
            }
            return false;
        }
    },
    delimiters: ['[[',']]']
});
function startwebsocket_callbacks(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    alertTop("success", "Loading...");
    // in the case where we have deleted tasks for files, we need some place to store them
    Vue.set(callbacks, 0, {'screencaptures': [], "display": "TASK DELETED"})
    ws.onmessage = function(event){
        if (event.data != ""){
            cb = JSON.parse(event.data);
            if (cb.hasOwnProperty('operator')){
                if (cb['operator'] == "null"){
                    delete cb.operator;
                }
                else{
                    op = cb['operator'].slice(0);
                    delete cb.operator;
                    cb['operator'] = op;
                }
            }
            cb['screencaptures'] = [];
            cb['display'] = cb['user'] + "@" + cb['host'] + "(" + cb['pid'] + ")";
            Vue.set(callbacks, cb['id'], cb);
        }
        else{
            if(finished_callbacks == false){
                startwebsocket_newscreenshots();
                finished_callbacks = true;
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        alertTop("danger", "Socket closed, please refresh");
    }
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    }
    ws.onopen = function(event){
        //console.debug("opened");
    }
};
function startwebsocket_newscreenshots(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/screenshots');
    ws.onmessage = function(event){
        if (event.data != ""){
            screencapture = JSON.parse(event.data);
            screencapture['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + screencapture['id'];
            Vue.set(screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'], screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'].length, screencapture);
        }
        else{
            if(finished_newcallbacks == false){
                startwebsocket_updatedscreenshots();
                finished_newcallbacks = true;
                setTimeout(() => { // setTimeout to put this into event queue
                    // executed after render
                    clearAlertTop();
                }, 0);
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        alertTop("danger", "Socket closed, please refresh");
    }
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    }
    ws.onopen = function(event){
        //console.debug("opened");
    }
};
function startwebsocket_updatedscreenshots(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updated_screenshots');
    ws.onmessage = function(event){
        if (event.data != ""){
            screencapture = JSON.parse(event.data);
            screencapture['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + screencapture['id'];
            for(var i = 0; i < screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'].length; i++){
                if(screencapture['id'] == screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'][i]['id']){
                    Vue.set(screencapture_div.callbacks[screencapture['callback_id']]['screencaptures'], i, screencapture);
                    return;
                }
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        alertTop("danger", "Socket closed, please refresh");
    }
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    }
    ws.onopen = function(event){
        //console.debug("opened");
    }
};
startwebsocket_callbacks();