var profiles = []; //all profiles data
var username = "{{name}}";
var finished_profiles = false;
var parameters = [];
var profile_parameters_table = new Vue({
    el: '#profileEditParametersTable',
    data: {
        parameters
    },
    methods: {
        add_parameter_button: function(){
            this.parameters.push({"name": "", "key": "", "hint": ""});
        },
        remove_parameter_button: function(p){
            //remove it from the list and also remove it from the back-end database
            parameter = this.parameters[p];
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + parameter['c2_profile'] + "/parameters/" + parameter['id'], delete_parameter_callback, "DELETE", null);
            this.parameters.splice(p,1);
        },
    },
    delimiters: ['[[',']]']
});
var payloads_table = new Vue({
    el: '#c2profiles_table',
    data: {
        profiles
    },
    methods: {
        delete_button: function(p){
            $( '#profileDeleteModal' ).modal('show');
            $( '#profileDeleteSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name, delete_profile, "DELETE", null);
            });
        },
	    update_button: function(p){
	        var possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
            var types = "";
            for(var i = 0; i < possiblePayloadTypes.length; i++){
                types = types + '<option value="' + possiblePayloadTypes[i].ptype + '">'
                + possiblePayloadTypes[i].ptype + '</option>';
            }
            $( '#profileUpdatePayloads' ).html(types);
            // before we show the fields, populate them with the current data
            $( '#profileUpdateName' ).val(p.name);
            $( '#profileUpdateDescription' ).val(p.description);
            edit_payload_files.edit_payload_file_list = [];
            $( '#profileUpdatePayloads' ).unbind('change').change(function(){
                edit_payload_files.edit_payload_file_list = $('#profileUpdatePayloads').val();
            });
            $( '#profileUpdatePayloads').val(p.payload_types).change();
            $( '#profileUpdateModal' ).modal('show');
            $( '#profileUpdateSubmit' ).unbind('click').click(function(){
                var data = {"name": p.name,
                        "description": $( '#profileUpdateDescription' ).val(),
                        "payload_types": $( '#profileUpdatePayloads' ).val()
                        };
                 if(data['payload_types'] == undefined){
                    data['payload_types'] = [];
                 }
                // update the data about a profile
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name, update_profile, "PUT", data);
                // update the files associated with a server profile
                var file = document.getElementById('profileEditServerFile');
                if(file.files.length > 0){
                    var filedata = file.files;
                    uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/upload", update_profile_ptype_files, filedata, {"payload_type": ""}, "POST");
                    file.value = file.defaultValue;
                }else{
                    // payload type files are processed after the server code, so if no new server files are uploaded, go ahead and trigger the requests for the agent code files
                    update_profile_files('{"status": "success", "name": "' + p.name + '"}');

                }
		    });
	    },
	    check_status_button: function(p){
	        alertTop("info", "Get a few lines of stdout/stderr ...");
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/status", check_status_callback, "GET", null);
	    },
	    edit_files_button: function(p){
	        //alertTop("info", "Loading files...");
	        profile_files_modal.profile_name = p.name;
	        profile_files_modal.server_folder = [];
	        profile_files_modal.got_list_from_container = false;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/files", edit_files_callback, "GET", null);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/container_files", null, "GET", null);
            $('#profileFilesModal').modal('show');
	    },
	    export_profile_button: function(p){
            //window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/export/" + p.name, '_blank').focus();
            payload = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/export/" + p.name);
            download_from_memory(p.name + ".json", btoa(payload));
	    },
	    running_button: function(p){
	        if (p.running){
	            command = "stop";
	        }
	        else{
	            command = "start";
	        }
	        alertTop("info", "Submitting " + command + " task to container...");
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/" + command, update_profile_running, "GET", null);
	    },
	    parameters_button: function(p){
	        // first clear the current profileEditParametersTable
	        profile_parameters_table.parameters = [];

            // then see if there are any parameters already created for this profile
            values = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters");
            values = JSON.parse(values);
            if(values['status'] == "success"){
                for(var i = 0; i < values['c2profileparameters'].length; i++){
                    profile_parameters_table.parameters.push(values['c2profileparameters'][i]);
                }
            }
            else{
                alertTop("danger", "failed to get parameters");
                return;
            }

            // for each one we get back, create a new row
            //    this will be in the form of a Vue object we modify
            $( '#profileEditParametersModal').modal('show');
            $( '#profileEditParametersSubmit').unbind('click').click(function(){
                // We now have a mix of old, new, modified, and deleted parameters
                for(var i = 0; i < profile_parameters_table.parameters.length; i ++){
                    data = {'key': profile_parameters_table.parameters[i]['key'],
                            'name': profile_parameters_table.parameters[i]['name'],
                            'hint': profile_parameters_table.parameters[i]['hint']};
                    if(profile_parameters_table.parameters[i].hasOwnProperty('id')){
                        //this means it's a parameter we've had before, so send an update
                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters/" + profile_parameters_table.parameters[i]['id'], edit_parameter_callback, "PUT", data);
                    }
                    else if(profile_parameters_table.parameters[i]['key'] != ""){
                        //this means we didn't have it before, so create a new property
                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters", add_parameter_callback, "POST", data);
                    }
                }
            });
	    },
	    create_new_parameter_instance_button: function(p){
            // first clear the current profileEditParametersTable
	        instances_table.current_parameters = [];
            instances_table.current_name = "";
            // then see if there are any parameters already created for this profile
            values = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters");
            values = JSON.parse(values);
            if(values['status'] == "success"){
                for(var i = 0; i < values['c2profileparameters'].length; i++){
                    instances_table.current_parameters.push(values['c2profileparameters'][i]);
                }
            }
            else{
                alertTop("danger", "failed to get parameters");
                return;
            }

            // for each one we get back, create a new row
            //    this will be in the form of a Vue object we modify
            $( '#profileCreateInstanceModal').modal('show');
            $( '#profileCreateInstanceSubmit').unbind('click').click(function(){
                // We now have a mix of old, new, modified, and deleted parameters
                data = {'instance_name': instances_table.current_name};
                for(var i = 0; i < instances_table.current_parameters.length; i ++){
                    data[instances_table.current_parameters[i]['name']] = instances_table.current_parameters[i]['hint'];
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameter_instances", create_new_parameter_instance_callback, "POST", data);
            });
	    },
    },
    delimiters: ['[[',']]']
});
function create_new_parameter_instance_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/parameter_instances", get_parameter_instance_callback, "GET", null);
}
function get_parameter_instance_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    instances_table.instances = [];
    var i = 0;
    Object.keys(data['instances']).forEach(function(k){
        data['instances'][k].forEach(function(e){
            e['show_all'] = false;
        });
        instances_table.instances.push({"instance_name": k,
                                        "c2_profile": data['instances'][k][0]['c2_profile'],
                                        "values": data['instances'][k],
                                        "id":i});
        i++;
    });
}
function check_status_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
}
var folders = [];
var profile_files_modal = new Vue({
    el: '#profileFilesModal',
    data: {
        profile_name: "",
        folders: [],
        server_folder: [],
        got_list_from_container: false
    },
    methods: {
        delete_file_button: function(folder, file){
            if(folder.includes("/Apfell/")){
                //the user is trying to delete a folder in a docker container
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/container_delete", delete_file_button_callback, "POST", {"folder": folder, "file": file});
            }else{
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/delete", delete_file_button_callback, "POST", {"folder": folder, "file": file});
            }
        },
        download_file_button: function(folder, file){
            if(folder.includes("/Apfell/")){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/container_download?folder=" + folder + "&file=" + file, null, "GET", null);
                alertTop("info", "Tasked download...");
            }else{
                //window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/download?folder=" + folder + "&file=" + file, "_blank");
                payload = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/download?folder=" + folder + "&file=" + file);
                download_from_memory(file, btoa(payload));
            }
        }
    },
    delimiters: ['[[',']]']
});
function delete_file_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        // successfully deleted the file, so we need to remove it from that
        for(var i = 0; i < profile_files_modal.folders.length; i++){
            if(profile_files_modal.folders[i].folder == data['folder']){
                for(var j = 0; j < profile_files_modal.folders[i].filenames.length; j++){
                    if(data['file'] == profile_files_modal.folders[i].filenames[j]){
                        profile_files_modal.folders[i].filenames.splice(j, 1);
                        return;
                    }
                }
            }
        }
    }
}
function edit_files_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        alertTop("info", "Tasked rabbitmq for container files...");
        got_list_from_container = false;
        profile_files_modal.folders = data['files'];
    }
}
var edit_payload_file_list = [];
var edit_payload_files = new Vue({
    el: '#profileUpdateBody',
    data: {
        edit_payload_file_list
    },
    delimiters: ['[[', ']]']
});
function add_parameter_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
};
function edit_parameter_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
};
function delete_parameter_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
    }
};
function update_profile(response){
	try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
	if(data['status'] == 'success'){
		for( var i = 0; i < profiles.length; i++){
		    if(payloads_table.profiles[i].id == data['id']){
		        payloads_table.profiles[i].name = data['name'];
		        payloads_table.profiles[i].description = data['description'];
		        payloads_table.profiles[i].payload_types = data['payload_types'];
		        payloads_table.profiles[i].running = data['running'];
		    }
		}
		if(edit_payload_files.edit_payload_file_list == undefined){
            alertTop("success", "Successfully updated");
		    return;
        }
        for(var i = 0; i < edit_payload_files.edit_payload_file_list.length; i++){
            var file = document.getElementById('edit_payload_file_list' + edit_payload_files.edit_payload_file_list[i]);
            if(file.files.length > 0){
                var filedata = file.files;
                var json_data = {"payload_type":  edit_payload_files.edit_payload_file_list[i]}
                uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + data['name'] + "/upload", update_profile_ptype_files, filedata, json_data, "POST");
                file.value = file.defaultValue;
            }
        }

	}
	else{
		//there was an error, so we should tell the user
		alertTop("danger", "Error: " + data['error']);
	}
}
function update_profile_running(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
	if(data['status'] == 'error'){
		alertTop("danger", data['error']);
	}
}
function update_profile_files(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        alertTop("success", "Success");
        //console.log("about to loop through looking for files to submit\n");
        // now iterate and upload files for all of the payload types as needed
        //TODO
    }
}
function update_profile_ptype_files(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        alertTop("success", "Successfully uploaded payload type files");
    }
}
function delete_profile(response){
	try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
	if(data['status'] == 'success'){
        var i = 0;
		for( i = 0; i < profiles.length; i++){
		    if(payloads_table.profiles[i].name == data['name']){
		        break;
		    }
		}
		payloads_table.profiles.splice(i, 1);
	}
	else{
		//there was an error, so we should tell the user
		alertTop("danger", "Error: " + data['error']);
	}
}
function startwebsocket_c2profiles(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/c2profiles/current_operation');
	ws.onmessage = function(event){
		if(event.data != ""){
			pdata = JSON.parse(event.data);
			//console.log(pdata);
			for(var i = 0; i < payloads_table.profiles.length; i++){
			    if(payloads_table.profiles[i]['name'] == pdata['name']){
			        Vue.set(payloads_table.profiles, i, Object.assign({}, payloads_table.profiles[i], pdata));
			        //clearAlertTop()
			        return;
			    }
			}
			pdata['payload_types'] = [];
			payloads_table.profiles.push(pdata);
			payloads_table.profiles.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
			Vue.nextTick(function(){
                $('#c2profilecardbody' + pdata['id']).on('hide.bs.collapse', function(){
                    //body is now hidden from user
                    self_id = this.id.split("body")[1];
                    document.getElementById('dropdownarrow' + self_id).style.transform = "rotate(0deg)";
                });
                $('#c2profilecardbody' + pdata['id']).on('show.bs.collapse', function(){
                    //body is now shown to the user
                    self_id = this.id.split("body")[1];
                    document.getElementById('dropdownarrow' + self_id).style.transform = "rotate(180deg)";
                })
			});
		}
		else{
		    if(finished_profiles == false){
		        finished_profiles = true;
		        startwebsocket_payloadtypec2profile();
		    }
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}
function startwebsocket_payloadtypec2profile(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloadtypec2profile');
	ws.onmessage = function(event){
		if(event.data != ""){
			pdata = JSON.parse(event.data);
			//profiles.push(pdata);
            for(var i = 0; i < profiles.length; i++){
                if(profiles[i]['id'] == pdata['c2_profile_id']){
                    if( !profiles[i]['payload_types'].includes(pdata['payload_type'])){
                        profiles[i]['payload_types'].push(pdata['payload_type']);
                    }
                }
            }
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}
function startwebsocket_rabbitmqresponses(){
    var ws = new WebSocket("{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/rabbitmq/c2_status");
    ws.onmessage = function(event){
		if(event.data != ""){
		    rdata = JSON.parse(event.data);
		    pieces = rdata['routing_key'].split(".");
            //{"status": "success", "body": "C2 is not running", "routing_key": "c2.status.RESTful Patchthrough.stopped"}
			if(rdata['status'] == "success"){
			    if(pieces[4] == "listfiles"){
			        data = JSON.parse(rdata['body']);
			        alertTop("success", "Received file list from container", 1);
			        profile_files_modal.got_list_from_container = true;
			        //console.log(JSON.stringify(rdata, null, 2));
			        for(var i = 0; i < data.length; i++){
			            //console.log(data[i]);
			            for(var j = 0; j < data[i]['filenames'].length; j++){
			                profile_files_modal.server_folder.push(data[i]['filenames'][j]);
                        }
                    }
			    }else if(pieces[4] == "removefile"){
			        //console.log(rdata);
			        data = JSON.parse(rdata['body']);
			        for(var i = 0; i < profile_files_modal.server_folder.length; i++){
			            if(profile_files_modal.server_folder[i] == data['file']){
			                profile_files_modal.server_folder.splice(i, 1);
			                return;
			            }
			        }
			    }else if(pieces[4] == "getfile"){
			        //console.log(rdata['body']);
			        data = JSON.parse(rdata['body']);
			        //clearAlertTop();
			        download_from_memory(data['filename'], data['data']);
			    }
			    else{
			        delay = 4;
			        if(pieces[4] == "status"){delay = 0;}
			        $('#stdoutStderrModal').modal('show');
			        $('#stdoutStderrBody').html("<b>Received Message</b>:<br> <span style='white-space:pre-wrap'>" + rdata['body'] + "</span>")
			        //alertTop("success", , delay);
			    }

			}else{
			    alertTop("danger", rdata['error']);
			}
			//console.log(event.data);
			pieces = rdata['routing_key'].split(".");
			for( var i = 0; i < profiles.length; i++){
                if(payloads_table.profiles[i].name == pieces[2]){
                    if(pieces[3] == "running"){
                        payloads_table.profiles[i].running = true;
                    }else{
                        payloads_table.profiles[i].running = false;
                    }
                    return;
                }
            }
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
		alertTop("danger", "Session expired, please refresh");
	}
}
startwebsocket_rabbitmqresponses();
function register_button(){
    try{
        var possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    //console.log(possiblePayloadTypes);
    var types = "";
    for(var i = 0; i < possiblePayloadTypes.length; i++){
        types = types + '<option value="' + possiblePayloadTypes[i].ptype + '">'
        + possiblePayloadTypes[i].ptype + '</option>';
    }
    $( '#profileCreatePayloadTypes' ).html(types);
    payload_files.payload_file_list = [];
    $( '#profileCreatePayloadTypes' ).unbind('change').change(function(){
        payload_files.payload_file_list = $('#profileCreatePayloadTypes').val();
    });
	$( '#profileCreateModal' ).modal('show');
    $( '#profileCreateSubmit' ).unbind('click').click(function(){
        var data = {"name": $( '#profileCreateName' ).val(),
                    "description": $( '#profileCreateDescription' ).val(),
                    "payload_types": $( '#profileCreatePayloadTypes' ).val()};
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/", create_profile, "POST", data);
    });

}
function create_profile(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
        return;
    }
    alertTop("success", "Successfully created profile");
    // we didn't get an error when we tried to create the initial c2 profile, now try to upload all of the code files for the selected types
    for(var i = 0; i < payload_files.payload_file_list.length; i++){
        var file = document.getElementById('payload_file_list' + payload_files.payload_file_list[i]);
        if(file.files.length > 0){
            var filedata = file.files;
            var json_data = {"payload_type":  payload_files.payload_file_list[i]}
            uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + data['name'] + "/upload", upload_profile_file,filedata, json_data, "POST");
            //uploadFiles("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/, edit_payloadtype_callback, filedata);
            file.value = file.defaultValue;
        }
    }
}
function upload_profile_file(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != "success"){
        alertTop("danger", data['error']);
    }
    else{
        alertTop("success", "Successfully uploaded files");
    }
}
var payload_file_list = [];
var payload_files = new Vue({
    el: '#profileCreateBody',
    data: {
        payload_file_list
    },
    delimiters: ['[[', ']]']
});
startwebsocket_c2profiles();

function import_button(){
    $( '#importModal' ).modal('show');
    $( '#importSubmit' ).unbind('click').click(function(){
        var file = document.getElementById('importFile');
        var filedata = file.files[0];
        uploadFile("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/import", import_button_callback, filedata);
        file.value = file.defaultValue;
    });
}
function import_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        alertTop("success", "Successfully imported");
    }else{
        alertTop("danger", data['error']);
    }
}
function reset_default_profiles_button(){
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/reset", reset_default_profiles_button_callback, "GET", null);
}
function reset_default_profiles_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        location.reload(true);
        alertTop("success", "Successfully reset default c2 profiles");
    }else{
        alertTop("danger", data['error']);
    }
}
function container_heartbeat_check(){
    var date = new Date();
    var now = date.getTime() + date.getTimezoneOffset() * 60000;;
    for(var i = 0; i < payloads_table.profiles.length; i ++){
        var heartbeat = new Date(payloads_table.profiles[i].last_heartbeat);
        var difference =  (now - heartbeat.getTime() ) / 1000;
        if(difference < 30){
            payloads_table.profiles[i]['container_running'] = true;
        }else{
            if(payloads_table.profiles[i]['container_running'] == true){
                // if it's currently set to running, let's change it in the db that it's down
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + payloads_table.profiles[i]['name'], null, "PUT", {"container_running": false});
            }
            payloads_table.profiles[i]['container_running'] = false;
        }
    }
}
setInterval(container_heartbeat_check, 500);
var instances_table = new Vue({
    el: '#instances_table',
    data: {
        instances: [],
        current_parameters: [],  // for creating a new instance
        current_name: ""  // for creating a new instance
    },
    methods: {
        delete_instance: function(i){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/parameter_instances/" + i['instance_name'], create_new_parameter_instance_callback, "DELETE", null);
        },
        toggle_show_all: function(e){
            e['show_all'] = !e['show_all'];
        },
        toggle_arrow: function(instid){
            $('#cardbody' + instid).on('shown.bs.collapse', function(){
                $('#color-arrow' + instid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + instid).on('hidden.bs.collapse', function(){
                $('#color-arrow' + instid).css("transform", "rotate(0deg)");
            });
        }
    },
    delimiters: ['[[', ']]'],
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/parameter_instances", get_parameter_instance_callback, "GET", null);