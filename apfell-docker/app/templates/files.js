
var ready_for_updates = false;
var files_div = new Vue({
    el: '#files_div',
    data: {
        hosts: {"uploads": [], "downloads": []}
    },
    methods: {
        delete_file: function(file_id){
            alertTop("info", "deleting...", 1);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/" + file_id, delete_file_callback, "DELETE", null);
        }
    },
    delimiters: ['[[',']]']
});
function delete_file_callback(response){
   try{
        var data = JSON.parse(response);
   }catch(error){
        alertTop("danger", "Session expired, please refresh");
   }
   if(data['status'] != "success"){
        alertTop("danger", data['error']);
   }
}
function startwebsocket_files(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/files/current_operation');
    alertTop("success", "Loading...");
    ws.onmessage = function(event){
        if (event.data != ""){
            //console.log(event.data);
            f = JSON.parse(event.data);
            if(f.deleted == true){return;}
            // will get file_meta data a host field and an operator field
            f['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + f['agent_file_id'];
            if(f.path.includes("/downloads/")){
                files_div.hosts['downloads'].push(f);
            }
            else{
                try{
                    f.upload = JSON.parse(f.upload);
                    f['path'] = f['path'].split("/").slice(-1)[0];
                }catch(e){
                    f.upload = {"remote_path": "agent load of " + f.upload};
                }
                files_div.hosts['uploads'].push(f);
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
            //console.log(file);
            file['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + f['agent_file_id'];
            if(file.path.includes("/downloads/")){
                for(var i = 0; i < files_div.hosts['downloads'].length; i++){
                    if(file['id'] == files_div.hosts['downloads'][i]['id']){
                        if(file['deleted'] == true){
                            files_div.hosts['downloads'].splice(i, 1);
                        }else{
                            Vue.set(files_div.hosts['downloads'], i, file);
                        }
                        files_div.$forceUpdate();
                        return;
                    }
                }
            }
            else{
                for(var i = 0; i < files_div.hosts['uploads'].length; i++){
                    if(file['id'] == files_div.hosts['uploads'][i]['id']){
                        if(file['deleted'] == true){
                            files_div.hosts['uploads'].splice(i, 1);
                        }else{
                            Vue.set(files_div.hosts['uploads'], i, file);
                        }
                        files_div.$forceUpdate();
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