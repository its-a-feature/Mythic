document.title = "Payload Creation";
var all_c2_data = {};
var all_payload_type_data = {};
var profile_parameters_table = new Vue({
    el: '#payloadCreation',
    data: {
        c2_profile_list: [
            {
                selected_c2_profile: "Select One...",
                c2_profile_parameters: [],
                c2_instance_values: {},
                selected_c2_instance: "Select One...",
            }
        ],
        payload_parameters: [],
        name: "",
        tag: "",
        c2_profile_options: [],
        payload_type_options: [],
        payload_command_options: [],
        selected_payload_commands: [],
        selected_payload_type: "Select One...",
        disable_commands: true,
        command_message: "Select the command functionality you want inserted into your initial payload. Commands can potentially loaded in later as well. Minimizing the number of commands in initial payloads can safeguard capabilities from defenders"
    },
    methods: {
        move_to_payloads: function(){
            if(this.c2_profile_list[0]['selected_c2_profile'] !== "Select One...")
            {
                profile_parameters_table.payload_type_options = all_c2_data[profile_parameters_table.c2_profile_list[0]['selected_c2_profile']]['ptype'];
                profile_parameters_table.payload_parameters = [];
                for(let i = 1; i < profile_parameters_table.c2_profile_list.length; i++){
                    // for each of the profiles we're using, find the intersection of their associated payload types
                    if(profile_parameters_table.c2_profile_list[i]['selected_c2_profile'] !== 'Select One...'){
                        profile_parameters_table.payload_type_options  = profile_parameters_table.payload_type_options.filter(function(value, index, arr){
                            return all_c2_data[profile_parameters_table.c2_profile_list[i]['selected_c2_profile']]['ptype'].includes(value);
                        });
                    }
                }
                profile_parameters_table.payload_type_options.unshift('Select One...');
                $('#payload-card-body').collapse('show');
                $('#commands-card-body').collapse('hide');
                $('#c2-card-body').collapse('hide');
            }else{
                alertTop("warning", "Select a C2 Profile first", 1);
            }
        },
        move_from_payloads: function(){
            $('#commands-card-body').collapse('hide');
            $('#payload-card-body').collapse('hide');
            $('#c2-card-body').collapse('show');
        },
        move_to_commands: function(){
            if( this.selected_payload_type !== "Select One..." ){
                $('#payload-card-body').collapse('hide');
                $('#c2-card-body').collapse('hide');
                $('#commands-card-body').collapse('show');
            }else{
                alertTop("warning", "Select a Payload Type first", 1);
            }
        },
        move_from_commands: function(){
            $('#c2-card-body').collapse('hide');
            $('#commands-card-body').collapse('hide');
            $('#payload-card-body').collapse('show');
            $('#payloadSubmit').prop('hidden', true);
            $('#payloadSubmitBottom').prop('hidden', true);
        },
        move_to_submit: function(){
            $('#c2-card-body').collapse('show');
            $('#commands-card-body').collapse('show');
            $('#payload-card-body').collapse('show');
            $('#payloadSubmit').prop('hidden', false);
            $('#payloadSubmitBottom').prop('hidden', false);
            $(window).scrollTop(0);
            alertTop("info", "Finalize your options and click \"Create Payload\"");
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
                    c2_profile_parameters_dict[this.c2_profile_list[j].c2_profile_parameters[i]['key']] = this.c2_profile_list[j].c2_profile_parameters[i]['hint'];
                }
                data['c2_profiles'].push({'c2_profile_parameters': c2_profile_parameters_dict, 'c2_profile': this.c2_profile_list[j]['selected_c2_profile']});
            }
            //console.log(data);
            data['commands'] = this.selected_payload_commands;
            data['wrapped_payload'] = $('#wrappedPayload option:selected').attr("name");
            data['transforms'] = []; //profile_parameters_table.payload_parameters;
            for(let i = 0; i < this.payload_parameters.length; i++){
                data['transforms'].push( {"transform": this.payload_parameters[i]['transform'],
                                          "order": this.payload_parameters[i]['order'],
                                          "parameter": this.payload_parameters[i]['value'],
                                          "t_type": "create"
                });
            }
            if(data['commands'].length === 0){
                alertTop("warning", "No commands selected. Payload might not have ability to exit, load, or run commands", 0);
            }else{
                alertTop("info", "Submitted creation request...", 2);
            }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create", submit_payload_callback, "POST", data);
        },
        add_c2_profile: function(){
            this.c2_profile_list.push(
                {
                    selected_c2_profile: "Select One...",
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
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + val + "/parameters", (response)=>{
                                try{
                                    let data = JSON.parse(response);
                                    if(data['status'] === 'success'){
                                        // populate the table values
                                        profile_parameters_table.c2_profile_list[index].c2_profile_parameters = []; //clear all the fields first
                                        for(let i = 0; i < data['c2profileparameters'].length; i++){
                                            profile_parameters_table.c2_profile_list[index].c2_profile_parameters.push(data['c2profileparameters'][i]);
                                            profile_parameters_table.$forceUpdate();
                                            profile_parameters_table.$nextTick(function(){
                                                adjust_size( document.getElementById(data['c2profileparameters'][i].key));
                                            });
                                        }
                                        profile_parameters_table.c2_profile_list[index].c2_profile_parameters.sort((a,b) =>(b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
                                        // we also need to populate the dropdown for the payload_type side


                                        $( '#c2_instance' + index ).prop('hidden', true);
                                        profile_parameters_table.c2_profile_list[index].c2_instance_values = {};
                                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + val + "/parameter_instances/", (response)=>{
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
                            $('#payloadWrapperRow').prop("hidden", true);
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
                                    if(x.c2_params_key === y.key){
                                        y.hint = x.value;
                                        //console.log(y);
                                        profile_parameters_table.$forceUpdate();
                                        setTimeout(() => { // setTimeout to put this into event queue
                                            // executed after render
                                            adjust_size( document.getElementById(y.key) );
                                        }, 0);
                                        //console.log("just set: " + JSON.stringify(y));
                                    }
                                });
                            });
                        }else{
                            profile_parameters_table.c2_profile_list[index].c2_profile_parameters.forEach(function(x){
                                //clear the text boxes for all the parameters so they auto fill with the hints again
                                x.hint = '';
                                //$('#' + x.key).val('');
                            });

                        }
                    });
                }
            }
        },
        selected_payload_type: function(val){
            // when this changes we need to get the available parameters and commands for this payload type
            //do a request to get the commands which will asynchronously populate the '#payload_commands' select multiple field
            if(val !== "Select One..."){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + val + "/commands", (response)=>{
                    try{
                        let data = JSON.parse(response);
                        profile_parameters_table.payload_command_options = [];
                        if(data['status'] === 'success'){
                            for(let i = 0; i < data['commands'].length; i++){
                                profile_parameters_table.payload_command_options.push(data['commands'][i]['cmd']);
                            }
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
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + profile_parameters_table.selected_payload_type, payload_type_callback, "GET", null);
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
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/bytype/" + val , payload_type_create_transforms_callback, "GET", null);
            }
            else{
                //clear all the data
                $('#payloadWrapperRow').prop("hidden", true);
                this.payload_command_options = [];
                this.selected_payload_commands = [];
                profile_parameters_table.payload_parameters = [];
            }
        }
    },
    delimiters: ['[[',']]']
});
$( document ).unbind('ready').ready(function(){
    //initially populate the c2_profiles section with the available c2profiles for this operation
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles", (response)=>{
         try{
            let data = JSON.parse(response);
            profile_parameters_table.c2_profile_options = ['Select One...'];
            for(let i = 0; i < data.length; i ++){
                profile_parameters_table.c2_profile_options.push(data[i].name);
                //save all of the information off into the global dictionary that we can reference later.
                all_c2_data[data[i].name] = data[i];
            }
        }catch(error) {
             alertTop("danger", "Session expired, please refresh");
         }
     }, "GET", null);
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes", (response)=>{
         try{
            let data = JSON.parse(response);
            for(let i = 0; i < data.length; i ++){
                //save all of the information off into the global dictionary that we can reference later.
                all_payload_type_data[data[i].ptype] = data[i];
            }
        }catch(error) {
             alertTop("danger", "Session expired, please refresh");
         }
     }, "GET", null);
});

function payload_type_create_transforms_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            //console.log(data['transforms']);
            for(let i in data['transforms']){
                if(data['transforms'][i]['t_type'] === "create"){
                    data['transforms'][i]['value'] = "";
                    if(data['transforms'][i]['parameter_type'] === 'ChooseOne'){
                        data['transforms'][i]['choices'] = data['transforms'][i]['parameter'].split("\n");
                        data['transforms'][i]['value'] = data['transforms'][i]['choices'][0];
                    }
                    profile_parameters_table.payload_parameters.push(data['transforms'][i]);
                }
            }
            profile_parameters_table.payload_parameters.sort((a,b) =>(b.order > a.order) ? -1 : ((a.order > b.order) ? 1 : 0));
        }else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
function commands_callback(response){

}
function payload_type_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            if(data['wrapper']){
                //this means we need to select a payload to wrap, so make a request to get all created payloads of payload type data['wrapped_payload_type']
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/bytype/" + data['wrapped_payload_type'], wrapped_payloads_callback, "GET", null);
                $('#payloadWrapperRow').attr("hidden", false);
            }
            else{
                $('#payloadWrapperRow').attr("hidden", true);
                $('#payload_commands').attr("disabled", false);
            }
        }
        else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
function wrapped_payloads_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === "success"){
        //now we should have a list of already created payloads, in our current operation, of the appropriate type that we can select from
        let options = "<option name='a'>Select One...</option>";
        for(let i = 0; i < data["payloads"].length; i++){
            options = options + '<option name="' + data['payloads'][i]['uuid'] + '">' +
            data['payloads'][i]['tag'] + "</option>";
        }
        $('#wrappedPayload').html(options);
        $('#payloadWrapperRow').attr("hidden", false);
    }
    else{
        alertTop("danger", data['error']);
    }
}
//any time the wrapped payload selection changes, we need to get information on that payload so we can update other sections of the page
$('#wrappedPayload').change(function(){
    if($('#wrappedPayload').val() !== "Select One..."){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/" + $('#wrappedPayload option:selected').attr("name"), update_wrapped_payloads_callback, "GET", null);
    }
    else{
        $('#payload_commands').html("");
    }
});
function update_wrapped_payloads_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === "success"){
        //update the selected commands along the right hand side based on teh payload selected
        let selected_options = "";
        for(let i = 0; i < data['commands'].length; i++){
            selected_options = selected_options + '<option name="' + data['commands'][i] + '">' + data['commands'][i] + "</option>";
        }
        $('#payload_commands').html(selected_options);
        $('#payload_commands').attr("disabled", true);
        //TODO when we add in payload specific parameters, update those here as well
    }
    else{
        alertTop("danger", data['error']);
    }
}
var global_uuids = {};
function submit_payload_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            alertTop("info", "Agent " + data['uuid'] + " submitted to the build process...<br>Wait here for a notification or go to the <a target='_blank' href=\"{{links.payload_management}}\" style='color:darkblue'> Payload Management Page</a> and wait for the final payload there", 0);
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
        if (event.data !== ""){
            //console.log(event.data);
            let data = JSON.parse(event.data);
            if(global_uuids[data['uuid']] === false){

                if(data['build_phase'] === "success"){
                    clearTop();
                    alertTop("success", "Success! Your agent, " + data['location'].split("/").pop() + ", was successfully built.<br><b>Execution help:</b> " + data['build_message'] + "<br><b>UUID:</b> " + data['uuid'], 0);
                    global_uuids[data['uuid']] = true;
                }
                else if(data['build_phase'] === "error"){
                    clearTop();
                    alertTop("danger", "Uh oh, something went wrong.<br><b>Error message:</b><pre> " + data['build_message'] + "</pre>");
                    global_uuids[data['uuid']] = true;
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
startwebsocket_rabbitmq_build_finished();