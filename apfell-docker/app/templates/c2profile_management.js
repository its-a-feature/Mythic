document.title = "C2 Profile Management";
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
            this.parameters.push({"name": "", "key": "", "hint": "", "randomize": false, "format_string": ""});
        },
        remove_parameter_button: function(p){
            //remove it from the list and also remove it from the back-end database
            let parameter = this.parameters[p];
            if(parameter.hasOwnProperty('id')){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + parameter['c2_profile'] + "/parameters/" + parameter['id'], delete_parameter_callback, "DELETE", null);
            }
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
            edit_payload_files.reset();
	        let possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
            for(let i = 0; i < possiblePayloadTypes.length; i++){
                if(p.payload_types.includes(possiblePayloadTypes[i].ptype)){
                    edit_payload_files.edit_payload_file_list.push({"name": possiblePayloadTypes[i].ptype, 'active': true});
                }else{
                    edit_payload_files.edit_payload_file_list.push({"name": possiblePayloadTypes[i].ptype, 'active': false});
                }

            }
            // before we show the fields, populate them with the current data
            edit_payload_files.name = p.name;
            edit_payload_files.authors = p.author;
            edit_payload_files.sample_server = p.sampleServer;
            edit_payload_files.sample_client = p.sampleClient;
            edit_payload_files.notes = p.notes;
            edit_payload_files.description = p.description;
            edit_payload_files.externally_hosted = p.external;
            edit_payload_files.is_p2p = p.is_p2p;
            edit_payload_files.is_server_routed = p.is_server_routed;

            $( '#profileUpdateModal' ).modal('show');
            $( '#profileUpdateSubmit' ).unbind('click').click(function(){
                let ptypes = [];
                for(let i = 0; i < edit_payload_files.edit_payload_file_list.length; i++){
                    if(edit_payload_files.edit_payload_file_list[i]['active']){
                        ptypes.push(edit_payload_files.edit_payload_file_list[i]['name']);
                    }
                }
                let data = {"name": p.name,
                        "description": edit_payload_files.description,
                        "payload_types": ptypes,
                        "external": edit_payload_files.externally_hosted,
                        'notes': edit_payload_files.notes,
                        'sampleServer': edit_payload_files.sample_server,
                        'sampleClient': edit_payload_files.sample_client,
                        'author': edit_payload_files.authors,
                        'is_p2p': edit_payload_files.is_p2p,
                        'is_server_routed': edit_payload_files.is_server_routed
                        };
                 if(data['payload_types'] === undefined){
                    data['payload_types'] = [];
                 }
                // update the data about a profile
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name, update_profile, "PUT", data);
                // update the files associated with a server profile
                let file = document.getElementById('profileUpdateServerFile');
                if(file.files.length > 0){
                    let filedata = file.files;
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
            profile_files_modal.set_to_blanks();
	        profile_files_modal.profile_name = p.name;
	        profile_files_modal.server_folder = [];
	        profile_files_modal.got_list_from_container = false;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/files", edit_files_callback, "GET", null);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/container_files", null, "GET", null);
            $('#profileFilesModal').modal('show');
	    },
	    export_profile_button: function(p){
            //window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/export/" + p.name, '_blank').focus();
            let payload = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/export/" + p.name);
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
            let values = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters");
            values = JSON.parse(values);
            if(values['status'] === "success"){
                for(let i = 0; i < values['c2profileparameters'].length; i++){
                    profile_parameters_table.parameters.push(values['c2profileparameters'][i]);
                }
                profile_parameters_table.parameters.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
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
                for(let i = 0; i < profile_parameters_table.parameters.length; i ++){
                    data = {'key': profile_parameters_table.parameters[i]['key'],
                            'name': profile_parameters_table.parameters[i]['name'],
                            'hint': profile_parameters_table.parameters[i]['hint'],
                            'randomize': profile_parameters_table.parameters[i]['randomize'],
                            'format_string': profile_parameters_table.parameters[i]['format_string']
                    };
                    if(profile_parameters_table.parameters[i].hasOwnProperty('id')){
                        //this means it's a parameter we've had before, so send an update
                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters/" + profile_parameters_table.parameters[i]['id'], edit_parameter_callback, "PUT", data);
                    }
                    else if(profile_parameters_table.parameters[i]['key'] !== ""){
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
            let values = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/parameters");
            values = JSON.parse(values);
            if(values['status'] === "success"){
                for(let i = 0; i < values['c2profileparameters'].length; i++){
                    instances_table.current_parameters.push(values['c2profileparameters'][i]);
                }
            }
            else{
                alertTop("danger", "failed to get parameters");
                return;
            }
            instances_table.current_parameters.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
            // for each one we get back, create a new row
            //    this will be in the form of a Vue object we modify
            $( '#profileCreateInstanceModal').modal('show');
            $( '#profileCreateInstanceSubmit').unbind('click').click(function(){
                // We now have a mix of old, new, modified, and deleted parameters
                let data = {'instance_name': instances_table.current_name};
                for(let i = 0; i < instances_table.current_parameters.length; i ++){
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
    if(data['status'] === 'error'){
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
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
    instances_table.instances = [];
    let i = 0;
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
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
}
var folders = [];
var profile_files_modal = new Vue({
    el: '#profileFilesModal',
    data: {
        profile_name: "",
        filename: "",
        folder: "",
        saving_container: false,
        getfile_is_download: true,
        folders: [],
        server_folder: [],
        language: "python",
        code: "",
        theme: "{{config['code-theme']}}",
        language_options: ["javascript", "c_cpp", "json", "kotlin", "objectivec", "perl", "plain_text", "powershell", "python", "sh", "ruby", "swift", "golang", "applescript","csharp", "assembly_x86"],
        theme_options: ["monokai", "ambiance", "chaos", "terminal", "xcode", "crimson_editor"],
        got_list_from_container: false
    },
    methods: {
        set_to_blanks: function(){
            this.filename = "";
            this.folder = "";
            this.code = "";
        },
        delete_file_button: function(folder, file){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/delete", delete_file_button_callback, "POST", {"folder": folder, "file": file});
        },
        delete_file_button_container: function(folder, file){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/container_delete", delete_file_button_callback, "POST", {"folder": folder, "file": file});
        },
        download_file_button: function(folder, file){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/download", (response)=>{
                let data = JSON.parse(response);
                if(data['status'] === 'error'){
                    alertTop("warning", data['error']);
                }else{
                    download_from_memory(file, data['file']);
                }

            }, "POST", {"folder": folder, "file": file});
        },
        download_file_button_container: function(folder, file){
            profile_files_modal.getfile_is_download = true;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/container_download", null, "POST", {"folder": folder, "file": file});
            alertTop("info", "Tasked download...");
        },
        send_to_edit: function(folder, file){
            //console.log(folder);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/download", (response)=>{
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'error'){
                        alertTop("warning", data['error']);
                    }else{
                        profile_files_modal.code = atob(data['file']);
                        profile_files_modal.filename = file;
                        profile_files_modal.folder = folder;
                        profile_files_modal.saving_container = false;
                    }
                }catch(error){
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {"folder": folder, "file": file});
        },
        send_to_edit_container: function(folder, file){
            profile_files_modal.getfile_is_download = false;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/container_download", (response)=>{
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'error'){
                        alertTop("warning", data['error']);
                    }else{
                        profile_files_modal.filename = file;
                        profile_files_modal.folder = folder;
                        profile_files_modal.saving_container = true;
                    }
                }catch(error){
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {"folder": folder, "file": file});
        },
        save_changes: function(){
            if(this.filename !== "") {
                if(this.saving_container){
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/upload", (response) => {
                        try {
                            let data = JSON.parse(response);
                            if (data['status'] === 'error') {
                                alertTop("warning", data['error']);
                            } else {
                                //this means the folder was successfully created, so update the UI to match
                                alertTop("info", "Sent to container...");
                            }
                        } catch (error) {
                            alertTop("danger", "Session expired, please refresh");
                        }
                    }, "POST", {"file_name": this.filename, "folder": this.folder, "code": btoa(profile_files_modal.code), "payload_type": ""});
                }else{
                    let payload_end = this.folder.indexOf("/");
                    if(payload_end < 0){
                        payload_end = this.folder.length;
                    }
                    let payload_type = this.folder.substring(0, payload_end);
                    let folder = this.folder.substring(payload_end);
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/upload", (response) => {
                        try {
                            let data = JSON.parse(response);
                            if (data['status'] === 'error') {
                                alertTop("warning", data['error']);
                            } else {
                                //this means the folder was successfully created, so update the UI to match
                                alertTop("success", "Successfully updated");
                            }
                        } catch (error) {
                            alertTop("danger", "Session expired, please refresh");
                        }
                    }, "POST", {"file_name": this.filename, "folder": folder, "code": btoa(profile_files_modal.code), "payload_type": payload_type});
                }
            }else{
                alertTop("warning", "Select a file to edit first");
            }
        },
        remove_folder: function(folder, i){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/remove_folder", (response)=>{
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        this.folders.splice(i, 1);
                    }else{
                        alertTop("warning", data['error']);
                    }
                }catch(error){
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {"folder": folder.folder});
        },
        remove_folder_container: function(folder, i) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + this.profile_name + "/files/remove_folder_container", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] !== 'success') {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {"folder": folder.folder});
        },
        add_folder: function(folder){
            $( '#C2ProfileEditFilesAddFolder' ).modal('show');
            $( '#C2ProfileEditFilesAddFolderSubmit' ).unbind('click').click(function(){
                let subfolder = $('#C2ProfileEditFilesAddFolderName').val();
                hide_modal('C2ProfileEditFilesAddFolder');
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + profile_files_modal.profile_name + "/files/add_folder", (response)=>{
                    try{
                        let data = JSON.parse(response);
                        //console.log(data);
                        if(data['status'] === 'error'){
                            alertTop("warning", data['error']);
                        }else{
                            //this means the folder was successfully created, so update the UI to match
                            profile_files_modal.folders.push({"folder":data['folder'] + "/" + data['sub_folder'], "filenames":[], "dirnames": []});
                        }
                    }catch(error){
                        console.log(error.toString());
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", {"folder": folder.folder, "sub_folder":  subfolder});
            });
        },
        add_folder_container: function(folder){
            $( '#C2ProfileEditFilesAddFolder' ).modal('show');
            $( '#C2ProfileEditFilesAddFolderSubmit' ).unbind('click').click(function(){
                let subfolder = $('#C2ProfileEditFilesAddFolderName').val();
                hide_modal('C2ProfileEditFilesAddFolder');
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + profile_files_modal.profile_name + "/files/add_folder_container", (response)=>{
                    try{
                        let data = JSON.parse(response);
                        //console.log(data);
                        if(data['status'] === 'error'){
                            alertTop("warning", data['error']);
                        }else{
                            //this means the folder was successfully created, so update the UI to match
                            alertTop("info", "Sent to container...");
                        }
                    }catch(error){
                        console.log(error.toString());
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", {"folder": folder.folder, "sub_folder":  subfolder});
            });
        },
        upload_agent_file: function(folder){
            $( '#C2ProfileEditFilesAddFile' ).modal('show');
            $( '#C2ProfileEditFilesAddFileSubmit' ).unbind('click').click(function(){
                let file = document.getElementById('C2ProfileEditFilesUploadFile');
                let filedata = file.files;
                let payload_end = folder.folder.indexOf("/");
                    if(payload_end < 0){
                        payload_end = folder.folder.length;
                    }
                let payload_type = folder.folder.substring(0, payload_end);
                hide_modal('C2ProfileEditFilesAddFile');
                uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + profile_files_modal.profile_name + "/upload", (response)=>{
                    try{
                        let data = JSON.parse(response);
                        if(data['status'] === 'error'){
                            alertTop("danger", data['error']);
                        }else{
                            //this means the file was successfully created, so update the UI to match
                            if(filedata.length > 0){
                                for(let i = 0; i < folder.filenames.length; i++){
                                    if(folder.filenames[i] === filedata[0]['name']){
                                        alertTop("success", "Updated file");
                                        file.value = file.defaultValue;
                                        return;
                                    }
                                }
                                folder.filenames.push(filedata[0]['name']);
                                file.value = file.defaultValue;
                                alertTop("success", "Uploaded file");
                            }
                            profile_files_modal.$forceUpdate();
                        }
                    }catch(error){
                        console.log(error.toString());
                        file.value = file.defaultValue;
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, filedata, {"folder": folder.folder.substring(payload_end), "payload_type": payload_type}, "POST");

            });
        },
        upload_agent_file_container: function(folder){
            $( '#C2ProfileEditFilesAddFile' ).modal('show');
            $( '#C2ProfileEditFilesAddFileSubmit' ).unbind('click').click(function(){
                let file = document.getElementById('C2ProfileEditFilesUploadFile');
                let filedata = file.files;
                hide_modal('C2ProfileEditFilesAddFile');
                uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + profile_files_modal.profile_name + "/upload", (response)=>{
                    try{
                        let data = JSON.parse(response);
                        if(data['status'] === 'error'){
                            alertTop("danger", data['error']);
                        }
                    }catch(error){
                        console.log(error.toString());
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, filedata, {"folder": folder.folder, "payload_type": ""}, "POST");
                file.value = file.defaultValue;
            });
        }
    },
    delimiters: ['[[',']]']
});
$('#C2ProfileEditFilesAddFolder').on('shown.bs.modal', function() {
    $('#profileFilesModal').css('z-index', 1030);
    $('#C2ProfileEditFilesAddFolder').css('z-index', 1041);
});
$('#C2ProfileEditFilesAddFolder').on('hidden.bs.modal', function() {
    $('#profileFilesModal').css('z-index', 1041);
    $('#C2ProfileEditFilesAddFolder').css('z-index', 1030);
});
$('#C2ProfileEditFilesAddFile').on('shown.bs.modal', function() {
    $('#profileFilesModal').css('z-index', 1030);
    $('#C2ProfileEditFilesAddFile').css('z-index', 1041);
});
$('#C2ProfileEditFilesAddFile').on('hidden.bs.modal', function() {
    $('#profileFilesModal').css('z-index', 1041);
    $('#C2ProfileEditFilesAddFile').css('z-index', 1030);
});
function hide_modal(modal_name){
    $('#' + modal_name).modal('hide');
}
function delete_file_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
    else{
        // successfully deleted the file, so we need to remove it from that
        for(let i = 0; i < profile_files_modal.folders.length; i++){
            if(profile_files_modal.folders[i].folder === data['folder']){
                for(let j = 0; j < profile_files_modal.folders[i].filenames.length; j++){
                    if(data['file'] === profile_files_modal.folders[i].filenames[j]){
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
    if(data['status'] === 'error'){
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
        edit_payload_file_list: [],
        name: "",
        description: "",
        authors: "",
        externally_hosted: false,
        is_p2p: false,
        is_server_routed: false,
        notes: "",
        sample_server: "",
        sample_client: ""
    },
    methods: {
        reset: function(){
            this.name = "";
            this.description = "";
            this.edit_payload_file_list = [];
            this.authors = "";
            this.externally_hosted = false;
            this.is_p2p = false;
            this.is_server_routed = false;
            this.notes = "";
            this.sample_server = "";
            this.sample_client = "";
        }
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
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
}
function edit_parameter_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
}
function delete_parameter_callback(response){
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
function update_profile(response){
	try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
	if(data['status'] === 'success'){
		for( let i = 0; i < profiles.length; i++){
		    if(payloads_table.profiles[i].id === data['id']){
		        payloads_table.profiles[i].name = data['name'];
		        payloads_table.profiles[i].description = data['description'];
		        payloads_table.profiles[i].payload_types = data['payload_types'];
		        payloads_table.profiles[i].running = data['running'];
		    }
		}
		if(edit_payload_files.edit_payload_file_list === undefined){
            alertTop("success", "Successfully updated");
		    return;
        }
        for(let i = 0; i < edit_payload_files.edit_payload_file_list.length; i++){
            if(edit_payload_files.edit_payload_file_list[i]['active']){
                let file = document.getElementById('edit_payload_file_list' + i);
                if(file.files.length > 0){
                    let filedata = file.files;
                    let json_data = {"payload_type":  edit_payload_files.edit_payload_file_list[i]['name']}
                    uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + data['name'] + "/upload", update_profile_ptype_files, filedata, json_data, "POST");
                    file.value = file.defaultValue;
                }
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
	if(data['status'] === 'error'){
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
    if(data['status'] === 'error'){
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
    if(data['status'] === 'error'){
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
	if(data['status'] === 'success'){
        var i = 0;
		for( i = 0; i < profiles.length; i++){
		    if(payloads_table.profiles[i].name === data['name']){
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
		if(event.data !== ""){
			let pdata = JSON.parse(event.data);
			//console.log(pdata);
			for(let i = 0; i < payloads_table.profiles.length; i++){
			    if(payloads_table.profiles[i]['id'] === pdata['id']){
			        if(pdata['deleted']){
                        payloads_table.profiles.splice(i, 1);
                    }else{
			             Vue.set(payloads_table.profiles, i, Object.assign({}, payloads_table.profiles[i], pdata));
                    }
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
		    if(finished_profiles === false){
		        finished_profiles = true;
		        startwebsocket_payloadtypec2profile();
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
function startwebsocket_payloadtypec2profile(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloadtypec2profile');
	ws.onmessage = function(event){
		if(event.data !== ""){
			let pdata = JSON.parse(event.data);
			//profiles.push(pdata);
            for(let i = 0; i < profiles.length; i++){
                if(profiles[i]['id'] === pdata['c2_profile_id']){
                    if( !profiles[i]['payload_types'].includes(pdata['payload_type'])){
                        profiles[i]['payload_types'].push(pdata['payload_type']);
                    }
                }
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
function startwebsocket_rabbitmqresponses(){
    var ws = new WebSocket("{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/rabbitmq/c2_status");
    ws.onmessage = function(event){
		if(event.data !== ""){
		    let rdata = JSON.parse(event.data);
		    //console.log(rdata);
		    let pieces = rdata['routing_key'].split(".");
            //{"status": "success", "body": "C2 is not running", "routing_key": "c2.status.RESTful Patchthrough.stopped"}
			if(rdata['status'] === "success"){
			    if(pieces[4] === "listfiles"){
			        let data = JSON.parse(rdata['body']);
			        clearTop();
			        alertTop("success", "Received file list from container", 1);
			        profile_files_modal.got_list_from_container = true;
			        //console.log(JSON.stringify(rdata, null, 2));
			        for(let i = 0; i < data.length; i++){
			            //console.log(data[i]);
			            profile_files_modal.server_folder.push(data[i]);
                    }
			    }else if(pieces[4] === "removefile"){
			        //console.log(rdata);
			        let data = JSON.parse(rdata['body']);
			        for(let i = 0; i < profile_files_modal.server_folder.length; i++){
                        if(profile_files_modal.server_folder[i].folder === data['folder']){
                            for(let j = 0; j < profile_files_modal.server_folder[i].filenames.length; j++){
                                if(data['file'] === profile_files_modal.server_folder[i].filenames[j]){
                                    profile_files_modal.server_folder[i].filenames.splice(j, 1);
                                    return;
                                }
                            }
                        }
                    }
			    }else if(pieces[4] === "removefolder"){
			        let data = JSON.parse(rdata['body']);
			        if(data['status'] === "success") {
                        for (let i = 0; i < profile_files_modal.server_folder.length; i++) {
                            if (profile_files_modal.server_folder[i].folder === data['folder']) {
                                profile_files_modal.server_folder.splice(i, 1);
                                return;
                            }
                        }
                    }else{
			            alertTop("warning", data['error']);
			        }
			    }else if(pieces[4] === "addfolder"){
			        let data = JSON.parse(rdata['body']);
			        if(data['status'] === "success"){
                        for (let i = 0; i < profile_files_modal.server_folder.length; i++) {
                            if (profile_files_modal.server_folder[i].folder === data['folder']) {
                                profile_files_modal.server_folder.push({"folder":data['folder'] + "/" + data['sub_folder'], "filenames":[], "dirnames": []});
                                return;
                            }
                        }
                    }else{
			            alertTop("warning", data['error']);
                    }
                }else if(pieces[4] === "getfile"){
			        //console.log(rdata['body']);
			        let data = JSON.parse(rdata['body']);
			        //clearAlertTop();
                    if(profile_files_modal.getfile_is_download){
                        download_from_memory(data['filename'], (data['data']));
                    }else{
                        profile_files_modal.code = atob(data['data']);
                        profile_files_modal.filename = data['filename'];
                    }
			    }else if(pieces[4] === "writefile"){
			        let data = JSON.parse(rdata['body']);
			        if(data['status'] === 'success'){
			            alertTop("success", "File written");
			            //console.log(data);
			            data['file'] = data['file'].replace(data['folder'], "").substring(1);
			            for (let i = 0; i < profile_files_modal.server_folder.length; i++) {
                            if (profile_files_modal.server_folder[i].folder === data['folder']) {
                                for(let j = 0; j < profile_files_modal.server_folder[i].filenames.length; j++){
                                    if(profile_files_modal.server_folder[i].filenames[j] === data['file']){
                                        return;
                                    }
                                }
                                profile_files_modal.server_folder[i].filenames.push(data['file']);
                            }
                        }
                    }else{
			            alertTop("warning", data['error']);
                    }
                }
			    else{
			        if(rdata['body'].length > 512000){
                        download_from_memory("c2_status_output.txt", btoa(rdata['body']));
                    }else{
			            $('#stdoutStderrModal').modal('show');
			            $('#stdoutstderrText').text(rdata['body']);
                    }
			    }
			}else{
			    alertTop("danger", rdata['error']);
			}
			//console.log(event.data);
            pieces = rdata['routing_key'].split(".");
			for( let i = 0; i < profiles.length; i++){
                if(payloads_table.profiles[i].name === pieces[2]){
                    payloads_table.profiles[i].running = pieces[3] === "running";
                    return;
                }
            }
		}
	};
	ws.onclose = function(){
		wsonclose();
	};
	ws.onerror = function(){
        wsonerror();
	};
}
startwebsocket_rabbitmqresponses();

function register_button(){
    payload_files.reset();
    try{
        var possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    for(let i = 0; i < possiblePayloadTypes.length; i++){
        payload_files.payload_file_list.push({'name': possiblePayloadTypes[i].ptype, 'active': false});
    }
	$( '#profileCreateModal' ).modal('show');
    $( '#profileCreateSubmit' ).unbind('click').click(function(){
        let ptypes = [];
        for(let i = 0; i < payload_files.payload_file_list.length; i++){
            if(payload_files.payload_file_list[i]['active']){
                ptypes.push(payload_files.payload_file_list[i]['name']);
            }
        }
        let data = {"name": payload_files.name,
                    "description": payload_files.description,
                    "payload_types": ptypes,
                    "external": payload_files.externally_hosted,
                    "author": payload_files.author,
                    "notes": payload_files.notes,
                    "sampleServer": payload_files.sample_server,
                    "sampleClient": payload_files.sample_client,
                    "is_p2p": payload_files.is_p2p,
                    "is_server_routed": payload_files.is_server_routed
        };
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
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
        return;
    }
    alertTop("success", "Successfully created profile");
    // we didn't get an error when we tried to create the initial c2 profile, now try to upload all of the code files for the selected types
    for(let i = 0; i < payload_files.payload_file_list.length; i++){
        if(payload_files.payload_file_list[i]['active']){
            let file = document.getElementById('payload_file_list' + i);
            if(file.files.length > 0){
                let filedata = file.files;
                let json_data = {"payload_type":  payload_files.payload_file_list[i]['name']};
                uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + data['name'] + "/upload", upload_profile_file,filedata, json_data, "POST");
                //uploadFiles("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/, edit_payloadtype_callback, filedata);
                file.value = file.defaultValue;
            }
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
    if(data['status'] !== "success"){
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
        payload_file_list: [],
        name: "",
        description: "",
        authors: "",
        externally_hosted: false,
        is_p2p: false,
        is_server_routed: false,
        notes: "",
        sample_server: "",
        sample_client: ""
    },
    methods: {
        reset: function(){
            this.name = "";
            this.description = "";
            this.profile_file_list = [];
            this.authors = "";
            this.externally_hosted = false;
            this.is_p2p = false;
            this.is_server_routed = false;
            this.notes = "";
            this.sample_server = "";
            this.sample_client = "";
        }
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
    if(data['status'] === 'success'){
        alertTop("success", "Successfully imported");
    }else{
        alertTop("danger", data['error']);
    }
}

function container_heartbeat_check(){
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    for(let i = 0; i < payloads_table.profiles.length; i ++){
        let heartbeat = new Date(payloads_table.profiles[i].last_heartbeat);
        let difference =  (now - heartbeat.getTime() ) / 1000;
        if(difference < 30){
            payloads_table.profiles[i]['container_running'] = true;
        }else{
            if(payloads_table.profiles[i]['container_running'] === true){
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
        },
        download_instance: function(i){
            let data = JSON.stringify(i);
            download_from_memory(i.instance_name + ".json", btoa(data));
        },
        duplicate_instance: function(i){
            // first clear the current profileEditParametersTable
	        instances_table.current_parameters = [];
            instances_table.current_name = i.instance_name + " copy";
            i.values.forEach((x) => {
                instances_table.current_parameters.push(
                    {"key": x.c2_params_key,
                    "name": x.c2_params_name,
                    "hint": x.value,
                    "randomize": x.randomize,
                    "format_string": x.format_string});
            });
            instances_table.current_parameters.sort((a,b) => (a.name > b.name) ? -1 : ((b.name > a.name) ? 1 : 0));
            instances_table.$forceUpdate();
            // for each one we get back, create a new row
            //    this will be in the form of a Vue object we modify
            $( '#profileCreateInstanceModal').modal('show');
            $('#profileCreateInstanceModal').on('shown.bs.modal', function () {
                instances_table.current_parameters.forEach((x)=>{
                   adjust_size( document.getElementById(x.key));
                });
            });
            $( '#profileCreateInstanceSubmit').unbind('click').click(function(){
                // We now have a mix of old, new, modified, and deleted parameters
                let data = {'instance_name': instances_table.current_name};
                for(let j = 0; j < instances_table.current_parameters.length; j ++){
                    data[instances_table.current_parameters[j]['name']] = instances_table.current_parameters[j]['hint'];
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + i.c2_profile + "/parameter_instances", create_new_parameter_instance_callback, "POST", data);
            });
        },
        import_instance: function(){
            $('#importInstanceModal').modal('show');
            $( '#importInstanceSubmit' ).unbind('click').click(function(){
                let file = document.getElementById('importInstanceFile');
                let filedata = file.files[0];
                let fileReader = new FileReader();
                  fileReader.onload = function(fileLoadedEvent){
                      try {
                          let i = JSON.parse(fileLoadedEvent.target.result);
                          instances_table.current_parameters = [];
                          instances_table.current_name = i.instance_name + " copy";
                          i.values.forEach((x) => {
                              instances_table.current_parameters.push({
                                  "key": x.c2_profile_key,
                                  "name": x.c2_profile_name,
                                  "hint": x.value
                              });
                          });
                          // for each one we get back, create a new row
                          //    this will be in the form of a Vue object we modify
                          $('#profileCreateInstanceModal').modal('show');
                          $('#profileCreateInstanceModal').on('shown.bs.modal', function () {
                                instances_table.current_parameters.forEach((x)=>{
                                   adjust_size( document.getElementById(x.key));
                                });
                            });
                          $('#profileCreateInstanceSubmit').unbind('click').click(function () {
                              // We now have a mix of old, new, modified, and deleted parameters
                              let data = {'instance_name': instances_table.current_name};
                              for (let j = 0; j < instances_table.current_parameters.length; j++) {
                                  data[instances_table.current_parameters[j]['name']] = instances_table.current_parameters[j]['hint'];
                              }
                              httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + i.c2_profile + "/parameter_instances", create_new_parameter_instance_callback, "POST", data);
                          });
                      }catch(error){
                          alertTop("danger", "Failed to import file: " + error.toString());
                      }
                  };
                  fileReader.readAsText(filedata, "UTF-8");
                file.value = file.defaultValue;
            });
        }
    },
    delimiters: ['[[', ']]'],
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/parameter_instances", get_parameter_instance_callback, "GET", null);
//ACE specific code from http://cwestblog.com/2018/08/04/ace-editor-vue-component/
/* START: <ace-editor> Vue component */
(function () {
  var PROPS = {
    selectionStyle: {},
    highlightActiveLine: { f: toBool },
    highlightSelectedWord: { f: toBool },
    readOnly: { f: toBool },
    cursorStyle: {},
    mergeUndoDeltas: { f: toBool },
    behavioursEnabled: { f: toBool },
    wrapBehavioursEnabled: { f: toBool },
    autoScrollEditorIntoView: { f: toBool, v: false },
    copyWithEmptySelection: { f: toBool },
    useSoftTabs: { f: toBool, v: false },
    navigateWithinSoftTabs: { f: toBool, v: false },
    hScrollBarAlwaysVisible: { f: toBool },
    vScrollBarAlwaysVisible: { f: toBool },
    highlightGutterLine: { f: toBool },
    animatedScroll: { f: toBool },
    showInvisibles: { f: toBool, v: true },
    showPrintMargin: { f: toBool },
    printMarginColumn: { f: toNum, v: 80 },
    // shortcut for showPrintMargin and printMarginColumn
    printMargin: { f: function (x) { return toBool(x, true) && toNum(x); } }, // false|number
    fadeFoldWidgets: { f: toBool },
    showFoldWidgets: { f: toBool, v: true },
    showLineNumbers: { f: toBool, v: true },
    showGutter: { f: toBool, v: true },
    displayIndentGuides: { f: toBool, v: true },
    fontSize: {},
    fontFamily: {},
    minLines: { f: toNum },
    maxLines: { f: toNum },
    scrollPastEnd: { f: toBoolOrNum },
    fixedWidthGutter: { f: toBool, v: false },
    theme: { v: 'monokai' },
    scrollSpeed: { f: toNum },
    dragDelay: { f: toNum },
    dragEnabled: { f: toBool, v: true },
    focusTimeout: { f: toNum },
    tooltipFollowsMouse: { f: toBool },
    firstLineNumber: { f: toNum, v: 1 },
    overwrite: { f: toBool },
    newLineMode: {},
    useWorker: { f: toBool },
    tabSize: { f: toNum, v: 2 },
    wrap: { f: toBoolOrNum, v: false },
    foldStyle: { v: 'markbegin' },
    mode: { v: 'javascript' },
    value: {},
  };

  var EDITOR_EVENTS = ['blur', 'change', 'changeSelectionStyle', 'changeSession', 'copy', 'focus', 'paste'];

  var INPUT_EVENTS = ['keydown', 'keypress', 'keyup'];

  function toBool(value, opt_ignoreNum) {
    var result = value;
    if (result != null) {
      (value + '').replace(
        /^(?:|0|false|no|off|(1|true|yes|on))$/,
        function(m, isTrue) {
          result = (/01/.test(m) && opt_ignoreNum) ? result : !!isTrue;
        }
      );
    }
    return result;
  }

  function toNum(value) {
    return (value == null || isNaN(+value)) ? value : +value;
  }

  function toBoolOrNum(value) {
    var result = toBool(value, true);
    return 'boolean' === typeof result ? result : toNum(value);
  }

  function emit(component, name, event) {
    component.$emit(name.toLowerCase(), event);
    if (name !== name.toLowerCase()) {
      component.$emit(
        name.replace(/[A-Z]+/g, function(m) { return ('-' + m).toLowerCase(); }),
        event
      );
    }
  }

  // Defined for IE11 compatibility
  function entries(obj) {
    return Object.keys(obj).map(function(key) { return [key, obj[key]]; });
  }

  Vue.component('aceEditor', {
    template: '<div ref="root"></div>',
    props: Object.keys(PROPS),
    data: function() {
      return {
        editor: null,
        isShowingError: false,
        isShowingWarning: false,
        allowInputEvent: true,
        // NOTE:  "lastValue" is needed to prevent cursor from always going to
        // the end after typing
        lastValue: ''
      };
    },
    methods: {
      setOption: function(key, value) {
        var func = PROPS[key].f;

        value = /^(theme|mode)$/.test(key)
          ? 'ace/' + key + '/' + value
          : func
            ? func(value)
            : value;

        this.editor.setOption(key, value);
      }
    },
    watch: (function () {
      var watch = {
        value: function(value) {
          if (this.lastValue !== value) {
            this.allowInputEvent = false;
            this.editor.setValue(value);
            this.allowInputEvent = true;
          }
        }
      };

      return entries(PROPS).reduce(
        function(watch, propPair) {
          var propName = propPair[0];
          if (propName !== 'value') {
            watch[propName] = function (newValue) {
              this.setOption(propName, newValue);
            };
          }
          return watch;
        },
        watch
      );
    })(),
    mounted: function() {
      var self = this;

      self.editor = window.ace.edit(self.$refs.root, { value: self.value });

      entries(PROPS).forEach(
        function(propPair) {
          var propName = propPair[0],
              prop = propPair[1],
              value = self.$props[propName];
          if (value !== undefined || prop.hasOwnProperty('v')) {
            self.setOption(propName, value === undefined ? prop.v : value);
          }
        }
      );

      self.editor.on('change', function(e) {
        self.lastValue = self.editor.getValue();
        if (self.allowInputEvent) {
          emit(self, 'input', self.lastValue);
        }
      });

      INPUT_EVENTS.forEach(
        function(eName) {
          self.editor.textInput.getElement().addEventListener(
            eName, function(e) { emit(self, eName, e); }
          );
        }
      );

      EDITOR_EVENTS.forEach(function(eName) {
        self.editor.on(eName, function(e) { emit(self, eName, e); });
      });

      var session = self.editor.getSession();
      session.on('changeAnnotation', function() {
        var annotations = session.getAnnotations(),
            errors = annotations.filter(function(a) { return a.type === 'error'; }),
            warnings = annotations.filter(function(a) { return a.type === 'warning'; });

        emit(self, 'changeAnnotation', {
          type: 'changeAnnotation',
          annotations: annotations,
          errors: errors,
          warnings: warnings
        });

        if (errors.length) {
          emit(self, 'error', { type: 'error', annotations: errors });
        }
        else if (self.isShowingError) {
          emit(self, 'errorsRemoved', { type: 'errorsRemoved' });
        }
        self.isShowingError = !!errors.length;

        if (warnings.length) {
          emit(self, 'warning', { type: 'warning', annotations: warnings });
        }
        else if (self.isShowingWarning) {
          emit(self, 'warningsRemoved', { type: 'warningsRemoved' });
        }
        self.isShowingWarning = !!warnings.length;
      });
    }
  });
})();
/* END: <ace-editor> Vue component */