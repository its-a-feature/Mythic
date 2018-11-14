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
                 httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name, update_profile, "PUT", data);
                 //we will upload files with this as well for the server code
                var file = document.getElementById('profileEditServerFile');
                if(file.files.length > 0){
                    var filedata = file.files;
                    uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/upload", update_profile_files, filedata, {"payload_type": ""}, "POST");
                    file.value = file.defaultValue;
                }
                // now iterate and upload files for all of the payload types as needed
                for(var i = 0; i < edit_payload_files.edit_payload_file_list.length; i++){
                    var file = document.getElementById('edit_payload_file_list' + edit_payload_files.edit_payload_file_list[i]);
                    if(file.files.length > 0){
                        var filedata = file.files;
                        var json_data = {"payload_type":  edit_payload_files.edit_payload_file_list[i]}
                        uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/upload", update_profile_files, filedata, json_data, "POST");
                        //uploadFiles("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/, edit_payloadtype_callback, filedata);
                        file.value = file.defaultValue;
                    }
                }
		    });
	    },
	    running_button: function(p){
	        if (p.running){
	            command = "stop";
	        }
	        else{
	            command = "start";
	        }
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
	    }
    },
    delimiters: ['[[',']]']
});
var edit_payload_file_list = [];
var edit_payload_files = new Vue({
    el: '#profileUpdateBody',
    data: {
        edit_payload_file_list
    },
    delimiters: ['[[', ']]']
});
function add_parameter_callback(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
};
function edit_parameter_callback(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
};
function delete_parameter_callback(response){
    data = JSON.parse(response);
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
    }
};
function update_profile(response){
	data = JSON.parse(response);
	if(data['status'] == 'success'){
		for( var i = 0; i < profiles.length; i++){
		    if(payloads_table.profiles[i].id == data['id']){
		        payloads_table.profiles[i].name = data['name'];
		        payloads_table.profiles[i].description = data['description'];
		        payloads_table.profiles[i].payload_types = data['payload_types'];
		        payloads_table.profiles[i].running = data['running'];
		    }
		}
		alertTop("success", "Successfully updated");
	}
	else{
		//there was an error, so we should tell the user
		alertTop("danger", "Error: " + data['error']);
	}
}
function update_profile_running(response){
    data = JSON.parse(response);
	if(data['status'] == 'success'){
		for( var i = 0; i < profiles.length; i++){
		    if(payloads_table.profiles[i].id == data['id']){
		        payloads_table.profiles[i].running = data['running'];
		    }
		}
	}
	else{
		//there was an error, so we should tell the user
		alertTop("danger", "Error: " + data['error']);
	}
}
function update_profile_files(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        alertTop("success", "Successfully uploaded files");
    }
}
function delete_profile(response){
	data = JSON.parse(response);
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
			pdata['payload_types'] = [];
			profiles.push(pdata);
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
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
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
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}
function register_button(){
    var possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
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
        //we will upload files with this as well for the server code
        var file = document.getElementById('profileCreateServerFile');
        var filedata = file.files;
        uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/", create_profile,filedata, data, "POST");
        file.value = file.defaultValue;
    });

}
function create_profile(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
        return;
    }
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
    data = JSON.parse(response);
    if(data['status'] != "success"){
        alertTop("danger", data['error']);
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
