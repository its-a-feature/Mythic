document.title = "Payload Creation";
var all_payload_type_data = {};
var profile_parameters_table = new Vue({
    el: '#payloadCreation',
    data: {
        all_c2_data: {},
        c2_profile_list: [
            {
                selected_c2_profile: " Select One...",
                c2_profile_parameters: [],
                c2_instance_values: {},
                selected_c2_instance: "Select One...",
            }
        ],
        os_options: [" Select Target OS"],
        selected_os: " Select Target OS",
        payload_parameters: [],
        name: "",
        tag: "",
        c2_profile_options: [],
        payload_type_options: [],
        payload_command_options: [],
        selected_payload_commands: [],
        selected_payload_type: "Select One...",
        disable_commands: true,
        command_message: "Select the command functionality you want inserted into your initial payload. Commands can potentially loaded in later as well. Minimizing the number of commands in initial payloads can safeguard capabilities from defenders",
        final_data: {},
        c2_buttons: true,
        pt_buttons: false,
        command_buttons: false,
        create_buttons: false
    },
    methods: {
        move_to_c2: function(){
            if(this.selected_os !==  " Select Target OS"){
                $('#c2-card-body').collapse('show');
                $('#os-card-body').collapse('hide');
            }else{
                alertTop("warning", "Select an OS first", 4);
            }
        },
        move_from_c2: function(){
            $('#c2-card-body').collapse('hide');
            this.selected_os = " Select Target OS";
            $('#os-card-body').collapse('show');
            this.name ="";
            while(this.c2_profile_list.length > 0){
                this.remove_c2_profile(null, 0);
            }
            this.add_c2_profile();
        },
        move_to_payloads: function(){
            if(this.c2_profile_list[0]['selected_c2_profile'] !== " Select One...")
            {
                profile_parameters_table.payload_type_options = profile_parameters_table.all_c2_data[profile_parameters_table.c2_profile_list[0]['selected_c2_profile']]['ptype'].map(x => x['ptype']);
                profile_parameters_table.payload_parameters = [];
                for(let i = 1; i < profile_parameters_table.c2_profile_list.length; i++){
                    // for each of the profiles we're using, find the intersection of their associated payload types
                    if(profile_parameters_table.c2_profile_list[i]['selected_c2_profile'] !== ' Select One...'){
                        profile_parameters_table.payload_type_options  = profile_parameters_table.payload_type_options.filter(function(value, index, arr){
                            let list = profile_parameters_table.all_c2_data[profile_parameters_table.c2_profile_list[i]['selected_c2_profile']]['ptype'].map(x => x.ptype);
                            return list.includes(value);
                        });
                    }
                }
                profile_parameters_table.payload_type_options = profile_parameters_table.payload_type_options.filter(function(value, index, arr){
                    return all_payload_type_data[value]['supported_os'].includes(profile_parameters_table.selected_os );
                });
                if(!profile_parameters_table.payload_type_options.includes(' Select One...')){
                    profile_parameters_table.payload_type_options.unshift(' Select One...');
                }
                this.c2_buttons = false;
                this.pt_buttons = true;
                $('#payload-card-body').collapse('show');
                $('#commands-card-body').collapse('hide');
                $('#c2-card-body').collapse('hide');
            }else{
                alertTop("warning", "Select a C2 Profile first", 1);
            }
        },
        move_from_payloads: function(){
            this.c2_buttons = true;
            this.pt_buttons = false;
            this.selected_payload_type = "Select One...";
            this.name ="";
            $('#commands-card-body').collapse('hide');
            $('#payload-card-body').collapse('hide');
            $('#c2-card-body').collapse('show');
        },
        move_to_commands: function(){
            if( this.selected_payload_type !== "Select One..." ){
                this.pt_buttons = false;
                this.command_buttons = true;
                this.create_buttons = false;
                $('#payload-card-body').collapse('hide');
                $('#c2-card-body').collapse('hide');
                $('#commands-card-body').collapse('show');
            }else{
                alertTop("warning", "Select a Payload Type first", 1);
            }
        },
        move_from_commands: function(){
            this.pt_buttons = true;
            this.command_buttons = false;
            this.create_buttons = false;
            $('#c2-card-body').collapse('hide');
            $('#commands-card-body').collapse('hide');
            $('#payload-card-body').collapse('show');
        },
        move_to_submit: function(){
            this.command_buttons = false;
            this.create_buttons = true;
            $('#commands-card-body').collapse('hide');
        },
        move_from_submit:  function(){
            this.create_buttons = false;
            $('#commands-card-body').collapse('show');
        },
        submit_payload: function(){
            let data = {"payload_type":this.selected_payload_type, "c2_profiles": []};
            if( this.name !== ""){
                data['location'] = this.name;
            }
            if(this.tag !== ""){
                data['tag'] = this.tag;
            }
            for(let j = 0; j < this.c2_profile_list.length; j++){
                // now get the c2 profile values into a dictionary
                let c2_profile_parameters_dict = {};
                for(let i = 0; i < this.c2_profile_list[j].c2_profile_parameters.length; i++){
                    c2_profile_parameters_dict[this.c2_profile_list[j].c2_profile_parameters[i]['name']] = this.c2_profile_list[j].c2_profile_parameters[i]['parameter'];
                }
                data['c2_profiles'].push({'c2_profile_parameters': c2_profile_parameters_dict, 'c2_profile': this.c2_profile_list[j]['selected_c2_profile']});
            }
            let found_exit = false;
            data['commands'] = [];
            this.selected_payload_commands.forEach((x)=>{
                if(x['is_exit']){found_exit = true;}
                data['commands'].push(x['cmd']);
            });
            data['build_parameters'] = []; //profile_parameters_table.payload_parameters;
            for(let i = 0; i < this.payload_parameters.length; i++){
                data['build_parameters'].push({
                    "name": this.payload_parameters[i]['name'],
                    "value": this.payload_parameters[i]['value']
                });
            }
            this.final_data = data;
            if(this.selected_payload_commands.length === 0){
                alertTop("warning", "No commands selected. Payload might not have ability to exit, load, or run commands. Do you want to continue?"
                    + "<br><a class='btn btn-success' onclick='submit_accept()'>Accept Risk</a>"
                    , 0, "", false);
            }
            else if(!found_exit){
                alertTop("warning", "No 'Exit' command selected. Payload might not have the ability to exit on command. Do you want to continue?"
                    + "<br><a class='btn btn-success' onclick='submit_accept()'>Accept Risk</a>", 0, "", false);
            } else{
                alertTop("info", "Submitted creation request...", 1);
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create", submit_payload_callback, "POST", data);
            }
        },
        add_c2_profile: function(){
            this.c2_profile_list.push(
                {
                    selected_c2_profile: " Select One...",
                    c2_profile_parameters: [],
                    c2_instance_values: {},
                    selected_c2_instance: "Select One..."
                }
            );
        },
        remove_c2_profile: function(val, index){
            if(this.c2_profile_list[index]['watch_selected_c2_profile'] !== null){
                this.c2_profile_list[index]['watch_selected_c2_profile']();
                this.c2_profile_list[index]['watch_selected_c2_profile'] = null;
            }
            if(this.c2_profile_list[index]['watch_selected_c2_instance'] !== null){
                this.c2_profile_list[index]['watch_selected_c2_instance']();
                this.c2_profile_list[index]['watch_selected_c2_instance'] = null;
            }
            this.c2_profile_list.splice(index, 1);
        },
        passing_requirements: function(val){
            if(!val.required){ return true}
            let regex = RegExp(val['verifier_regex']);
            return regex.test(val['parameter']);
        },
        passing_payload_requirements: function(val){
            if(!val.required){ return true}
            let regex = RegExp(val['verifier_regex']);
            return regex.test(val['value']);
        },
        filtered_c2_options: function(){
            let new_options = [{"name": ' Select One...', "payload_types": []}];
            if(this.c2_profile_options === undefined){return []}
            Object.keys(this.all_c2_data).forEach(function(i) {
                let option = {"name": profile_parameters_table.all_c2_data[i]['name'], "payload_types": []};
                for (let j = 0; j < profile_parameters_table.all_c2_data[i]['ptype'].length; j++) {
                    if (profile_parameters_table.all_c2_data[i]['ptype'][j]['supported_os'].includes(profile_parameters_table.selected_os)) {
                        option['payload_types'].push(profile_parameters_table.all_c2_data[i]['ptype'][j]['ptype']);
                    }
                }
                if (option['payload_types'].length > 0) {
                    new_options.push(option);
                }
            });
            return new_options;
      }
    },
    watch: {
        c2_profile_list: {
            immediate: true,
            handler(imp){
                for (let index in this.c2_profile_list) {
                    if(this.c2_profile_list[index]['watch_selected_c2_profile'] !== undefined){
                        this.c2_profile_list[index]['watch_selected_c2_profile']();
                        this.c2_profile_list[index]['watch_selected_c2_profile'] = undefined;
                    }
                    if(this.c2_profile_list[index]['watch_selected_c2_instance'] !== undefined){
                        this.c2_profile_list[index]['watch_selected_c2_instance']();
                        this.c2_profile_list[index]['watch_selected_c2_instance'] = undefined;
                    }
                    this.c2_profile_list[index]['watch_selected_c2_profile'] = this.$watch(['c2_profile_list', index, 'selected_c2_profile'].join('.'), (val, oldVal) => {
                        if(val !== "Select One..."){
                            //make a request out to the c2 profile parameters api to get the parameters
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + profile_parameters_table.all_c2_data[val]['id'] + "/parameters", (response)=>{
                                try{
                                    let data = JSON.parse(response);
                                    if(data['status'] === 'success'){
                                        // populate the table values
                                        profile_parameters_table.c2_profile_list[index].c2_profile_parameters = []; //clear all the fields first
                                        for(let i = 0; i < data['c2profileparameters'].length; i++){
                                            let inst = data['c2profileparameters'][i];
                                            if(inst['parameter_type'] === 'ChooseOne'){
                                                inst['parameter'] = inst['default_value'].split("\n")[0];
                                            }else{
                                                inst['parameter'] = inst['default_value'];
                                            }
                                            profile_parameters_table.c2_profile_list[index].c2_profile_parameters.push(inst);
                                            profile_parameters_table.$forceUpdate();
                                            if(data['c2profileparameters'][i].parameter_type === 'String'){
                                                profile_parameters_table.$nextTick(function(){
                                                    adjust_size( document.getElementById(data['c2profileparameters'][i].name));
                                                });
                                            }
                                        }
                                        profile_parameters_table.c2_profile_list[index].c2_profile_parameters.sort((a,b) =>(b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
                                        // we also need to populate the dropdown for the payload_type side

                                        $( '#c2_instance' + index ).prop('hidden', true);
                                        profile_parameters_table.c2_profile_list[index].c2_instance_values = {};
                                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + profile_parameters_table.all_c2_data[val]['id'] + "/parameter_instances/", (response)=>{
                                            try{
                                                let data = JSON.parse(response);
                                                if(data['status'] === 'success'){
                                                    if(Object.keys(data['instances']).length !== 0){
                                                        Object.keys(data['instances']).forEach(function(k){
                                                            Vue.set(profile_parameters_table.c2_profile_list[index].c2_instance_values, k, data['instances'][k]);
                                                        });
                                                        //profile_parameters_table.c2_instance_values = data['instances'];
                                                        $('#c2_instance' + index).prop('hidden', false);
                                                    }
                                                }
                                            }catch(error){
                                                console.log(error.toString());
                                                alertTop("danger", "Session expired, please refresh");
                                            }
                                        }, "GET", null);
                                    }
                                    else{
                                        alertTop("danger", data['error']);
                                    }
                                }catch(error){
                                    console.log(error.toString());
                                    alertTop("danger", "Session expired, please refresh");
                                }
                            }, "GET", null);
                            //now potentially update the payload options section
                        }else{
                            this.c2_profile_list[index].c2_profile_parameters = [];
                            this.c2_profile_list[index].payload_parameters = [];
                            this.c2_profile_list[index].c2_instance_values = {};
                            $('#c2_instance' + index).prop("hidden", true);
                            profile_parameters_table.$forceUpdate();
                        }
                    });
                    this.c2_profile_list[index]['watch_selected_c2_instance'] = this.$watch(['c2_profile_list', index, 'selected_c2_instance'].join('.'), (val, oldVal) =>{
                        //console.info("c2_profile_list", this.c2_profile_list[index], val, oldVal);
                        if( val !== "Select One..."){
                            profile_parameters_table.c2_profile_list[index].c2_instance_values[val].forEach(function(x){
                                //populate the boxes based on the parameter instance
                                profile_parameters_table.c2_profile_list[index].c2_profile_parameters.forEach(function(y){
                                    if(x.name === y.name){
                                        y.parameter = x.value;
                                        profile_parameters_table.$forceUpdate();
                                        if(y.parameter_type === 'String'){
                                            setTimeout(() => { // setTimeout to put this into event queue
                                                // executed after render
                                                adjust_size( document.getElementById(y.name) );
                                            }, 0);
                                        }
                                        //console.log("just set: " + JSON.stringify(y));
                                    }
                                });
                            });
                        }else{
                            profile_parameters_table.c2_profile_list[index].c2_profile_parameters.forEach(function(x){
                                //clear the text boxes for all the parameters so they auto fill with the hints again
                                if(x.parameter_type === 'ChooseOne'){
                                    x.parameter = x.default_value.split('\n')[0];
                                }else{
                                    x.parameter = x.default_value;
                                }
                            });

                        }
                    });
                }
            }
        },
        selected_os: function(val){
          if(val !== " Select Target OS"){
              profile_parameters_table.move_to_c2();
          }
        },
        selected_payload_type: function(val){
            // when this changes we need to get the available parameters and commands for this payload type
            //do a request to get the commands which will asynchronously populate the '#payload_commands' select multiple field
            if(val !== "Select One..."){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + all_payload_type_data[val]['id'] + "/commands", (response)=>{
                    try{
                        if(all_payload_type_data[val]['file_extension'] !== ""){
                            this.name = val + "." + all_payload_type_data[val]['file_extension'];
                        }else{
                            this.name = val;
                        }
                        let data = JSON.parse(response);
                        profile_parameters_table.payload_command_options = [];
                        if(data['status'] === 'success'){
                            profile_parameters_table.payload_command_options = data['commands'];
                            if(!all_payload_type_data[val]['supports_dynamic_loading']){
                                profile_parameters_table.command_message = "The selected payload type doesn't support dynamic loading of modules, so all commands are selected";
                                profile_parameters_table.selected_payload_commands = profile_parameters_table.payload_command_options;
                                profile_parameters_table.disable_commands = true;
                            }else{
                                profile_parameters_table.command_message = "Select the command functionality you want stamped into your initial payload. Commands can potentially loaded in later as well. Minimizing the number of commands in initial payloads can safeguard capabilities from defenders"
                                profile_parameters_table.disable_commands = false;
                                profile_parameters_table.selected_payload_commands = [];
                            }
                            profile_parameters_table.$forceUpdate();
                            //now we need to get information about this payload type besides just the commands
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + all_payload_type_data[profile_parameters_table.selected_payload_type]['id'], payload_type_callback, "GET", null);
                        }
                        else{
                            alertTop("danger", data['error']);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "GET", null);

                // potentially get the create transforms for the payload type
                profile_parameters_table.payload_parameters = [];
                profile_parameters_table.payload_parameters = all_payload_type_data[val]['build_parameters'];
                profile_parameters_table.payload_parameters.sort((a,b) =>(b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
                for(let i in profile_parameters_table.payload_parameters){
                    if(profile_parameters_table.payload_parameters[i]['parameter_type'] === "ChooseOne"){
                        profile_parameters_table.payload_parameters[i]['choices'] = profile_parameters_table.payload_parameters[i]['parameter'].split("\n");
                        profile_parameters_table.payload_parameters[i]['value'] = profile_parameters_table.payload_parameters[i]['choices'][0];
                    }
                }
            }
        }
    },
    delimiters: ['[[',']]']
});
function submit_accept(){
    clearTop();
    alertTop("info", "Submitted creation request...", 2);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create", submit_payload_callback, "POST", profile_parameters_table.final_data);
}
$( document ).unbind('ready').ready(function(){
    //initially populate the c2_profiles section with the available c2profiles for this operation
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles", (response)=>{
         try{
            let data = JSON.parse(response);
            profile_parameters_table.c2_profile_options = [' Select One...'];
            for(let i = 0; i < data.length; i ++){
                //profile_parameters_table.c2_profile_options.push(data[i].name);
                //save all of the information off into the global dictionary that we can reference later.
                profile_parameters_table.all_c2_data[data[i].name] = data[i];
            }
            //profile_parameters_table.c2_profile_options.sort((a,b) =>(b.toLowerCase() > a.toLowerCase()) ? -1 : ((a.toLowerCase() > b.toLowerCase()) ? 1 : 0));
        }catch(error) {
             console.log(error);
             alertTop("danger", "Session expired, please refresh");
         }
     }, "GET", null);
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes", (response)=>{
         try{
            let data = JSON.parse(response);
            for(let i = 0; i < data['payloads'].length; i ++){
                //save all of the information off into the global dictionary that we can reference later.
                all_payload_type_data[data['payloads'][i].ptype] = data['payloads'][i];
                data['payloads'][i]['supported_os'].split(",").forEach((x)=>{
                    if(!profile_parameters_table.os_options.includes(x)){
                        profile_parameters_table.os_options.push(x);
                    }
                });
            }
            profile_parameters_table.os_options.sort((a,b) =>(b.toLowerCase() > a.toLowerCase()) ? -1 : ((a.toLowerCase() > b.toLowerCase()) ? 1 : 0));
        }catch(error) {
             console.log(error);
             alertTop("danger", "Session expired, please refresh");
         }
     }, "GET", null);
});

function payload_type_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){

        }
        else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
var global_uuids = {};
function submit_payload_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            alertTop("info", "Agent " + data['uuid'] + " submitted to the build process...<br>Wait here for a notification or go to the <a target='_blank' href=\"{{links.payload_management}}\" style='color:darkblue'> Payload Management Page</a> and wait for the final payload there", 0, "", false);
            global_uuids[data['uuid']] = false;  // indicate if we've seen the final success/failure message for this yet or not
        }
        else{
            alertTop("danger", "Error: " + data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
function startwebsocket_rabbitmq_build_finished(){
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloads/current_operation');
    ws.onmessage = function(event){
        // sometimes we get teh messages too quickly and so we get the same data twice when querying the db
        if(event.data === "no_operation"){
	        alertTop("warning", "No operation selected");
        }
        else if (event.data !== ""){
            //console.log(event.data);
            let data = JSON.parse(event.data);
            if(global_uuids[data['uuid']] === false){
                if(data['build_phase'] === "success"){
                    clearTop();
                    alertTop("success", "<b>Build Message:</b> " + data['build_message'] + "<br><b>UUID:</b> " + data['uuid']
                        + "<br><a class='btn btn-info' href='{{links.payload_management}}'>Manage Payload</a><a class='btn btn-info' href='{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/download/" + data['uuid'] + "'>Download Payload</a>", 0, "Success! Your agent, " + data['file_id']['filename'] + ", was successfully built.", false);
                    global_uuids[data['uuid']] = true;
                }
                else if(data['build_phase'] === "error"){
                    clearTop();
                    alertTop("danger", data['build_message'], 0, "Uh oh, something went wrong.");
                    global_uuids[data['uuid']] = true;
                }
            }
        }
    };
    ws.onclose = function(event){
		wsonclose(event);
	};
	ws.onerror = function(event){
        wsonerror(event);
	};
}
startwebsocket_rabbitmq_build_finished();