var services = []; //all services data
var hosting_table = new Vue({
    el: '#hosting_table',
    data: {
        services
    },
    methods: {
        start_button: function(host){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/attacks/host_directory",
            getServices, "POST", {'port': host.port, 'directory': host.directory});
        },
        stop_button: function(host){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/attacks/host_directory/" + host.port.toString(),
            getServices, "DELETE", null);
        }
    },
    delimiters: ['[[',']]']
});
function getServices(){
    services.length = 0;
    var current_services = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/attacks/host_directory"));
    for(var i = 0; i < current_services.length; i++){
        services.push(current_services[i]);
    }
}
function create_directory_button(){
    $( '#servicesModal' ).modal('show');
    $( '#servicesSubmit' ).unbind('click').click(function(){
        var port = $( '#servicePort' ).val();
        var dir = $( '#serviceDirectory' ).val();
        //should have all the data we need, submit the POST request
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/attacks/host_directory",
        getServices, "POST", {'port': port, 'directory': dir});
    });
}
var manualFileModal = new Vue({
    el: '#manualFileModal',
    data: {
        local_file: false,
        path: ""
    },
    delimiters: ['[[',']]']
});
function create_file_button(){
    $( '#manualFileModal').modal('show');
    $( '#manualFileSubmit').unbind('click').click(function(){
        var data = {'local_file': manualFileModal.local_file};
        if(manualFileModal.local_file){
            data['file_path'] = manualFileModal.path;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/manual/",
            manual_file_upload, "POST", data);
        }else{
            //uploadFileAndJSON(url, callback, file, data, method)
            var file = document.getElementById('manualFileUpload');
            var filedata = file.files;
            uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/manual/",
            manual_file_upload, filedata, data, "POST");
            file.value = file.defaultValue;
        }
    });
}
function manual_file_upload(response){
    data = JSON.parse(response);
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
    }
}
getServices();
var manual_file_table = new Vue({
    el: '#manualFileTable',
    data: {
        files: []
    },
    methods: {
        delete_button: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/" + id.toString(),
            delete_callback, "DELETE", null);
        },
        download_button: function(id){
            window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" +id.toString(), '_blank').focus();
        }
    },
    delimiters: ['[[', ']]']
});
function delete_callback(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        for(var i = 0; i < manual_file_table.files.length; i++){
            if(manual_file_table.files[i].id == data['id']){
                manual_file_table.files.splice(i, 1);
                return;
            }
        }
    }
}
function startwebsocket_manualFiles(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/files/current_operation');
	ws.onmessage = function(event){
		if(event.data != ""){
		    data = JSON.parse(event.data);
            if(data['task'] == 'null' || data['task'] == "null"){
                manual_file_table.files.push(data);
            }
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
};
startwebsocket_manualFiles();