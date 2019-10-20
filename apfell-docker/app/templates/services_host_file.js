
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
            data['path'] = manualFileModal.path.trim();
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
        alertTop("info", "Loading file...");
    });
}
function manual_file_upload(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === "error"){
        alertTop("danger", data['error']);
    }
}
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
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
    else{
        for(var i = 0; i < manual_file_table.files.length; i++){
            if(manual_file_table.files[i].id === data['id']){
                manual_file_table.files.splice(i, 1);
                return;
            }
        }
    }
}
function startwebsocket_manualFiles(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/files/current_operation');
	ws.onmessage = function(event){
		if(event.data !== ""){
		    data = JSON.parse(event.data);
            if(data['task'] === 'null' || data['task'] == null){
                manual_file_table.files.push(data);
            }
		}
	};
	ws.onclose = function(){
		wsonclose();
	};
	ws.onerror = function(){
        wsonerror();
	};
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}
startwebsocket_manualFiles();