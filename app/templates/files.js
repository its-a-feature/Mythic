var hosts = {"uploads": {}, "downloads": {}};
var ready_for_updates = false;
var files_div = new Vue({
    el: '#files_div',
    data: {
        hosts
    },
    methods: {
    },
    delimiters: ['[[',']]']
});
function startwebsocket_files(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/files/current_operation');
    alertTop("success", "Loading...");
    ws.onmessage = function(event){
        if (event.data != ""){
            f = JSON.parse(event.data);
            // will get file_meta data a host field and an operator field
            f['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + f['id'];
            if(f.path.includes("/downloads/")){
                if(!files_div.hosts['downloads'].hasOwnProperty(f.host)){
                    Vue.set(files_div.hosts['downloads'], f.host,  []);
                }
                files_div.hosts['downloads'][f.host].push(f);
            }
            else{
                if(!files_div.hosts['uploads'].hasOwnProperty(f.host)){
                    Vue.set(files_div.hosts['uploads'], f.host,  []);
                }
                f.upload = JSON.parse(f.upload);
                files_div.hosts['uploads'][f.host].push(f);
            }
        }
        else{
            if(ready_for_updates == false){
                ready_for_updates = true;
                setTimeout(() => { // setTimeout to put this into event queue
                    // executed after render
                    clearAlertTop();
                }, 0);
                startwebsocket_updatedfiles();
            }
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        alertTop("danger", "Socket closed. Please refresh");
    }
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Socket errored, please refresh");
    }
    ws.onopen = function(event){
        //console.debug("opened");
    }
};

function startwebsocket_updatedfiles(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updated_files/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            file = JSON.parse(event.data);
            file['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + f['id'];
            if(file.path.includes("/downloads/")){

                for(var i = 0; i < files_div.hosts['downloads'][file.host].length; i++){
                    if(file['id'] == files_div.hosts['downloads'][file.host][i]['id']){
                        Vue.set(files_div.hosts['downloads'][file.host], i, file);
                        return;
                    }
                }
            }
            else{
                for(var i = 0; i < files_div.hosts['uploads'][file.host].length; i++){
                    if(file['id'] == files_div.hosts['uploads'][file.host][i]['id']){
                        Vue.set(files_div.hosts['uploads'][file.host], i, file);
                        return;
                    }
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
startwebsocket_files();