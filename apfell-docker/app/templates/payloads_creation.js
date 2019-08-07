var all_c2_data = {};
var username = "{{name}}";
var profile_parameters_table = new Vue({
    el: '#payloadCreation',
    data: {
        c2_profile_parameters: [],
        payload_parameters: [],
        c2_instance_values: {}
    },
    methods: {
        move_to_payloads: function(){
            if($('#c2_profile').val() != "Select One...")
            {
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
            if( $('#payload_type').val() != "Select One..." ){
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
            this.unlock_everything();
        },
        move_to_submit: function(){
            $('#c2-card-body').collapse('show');
            $('#commands-card-body').collapse('show');
            $('#payload-card-body').collapse('show');
            $('#payloadSubmit').prop('hidden', false);
            this.lock_everything_for_submit();
        },
        lock_everything_for_submit: function(){
            $('#payload_commands').attr("disabled", true);
            $('#c2_profile').attr("disabled", true);
            $('#payload_type').attr("disabled", true);
            $('#c2_instance').attr("disabled", true);
            $('#c2_param_table').find('textarea').attr('disabled', true);
            $('#payloadParameterTable').find('textarea').attr('disabled', true);
            $('#location').attr('disabled', true);
            $('#default_tag').attr('disabled', true);
            $('#move_to_payloads_button').attr('disabled', true);
            $('#move_to_commands_button').attr('disabled', true);
            $('#move_to_submit_button').attr('disabled', true);
            $('#move_from_payloads_button').attr('disabled', true);
        },
        unlock_everything: function(){
            $('#payload_commands').attr("disabled", false);
            $('#c2_profile').attr("disabled", false);
            $('#payload_type').attr("disabled", false);
            $('#c2_instance').attr("disabled", false);
            $('#c2_param_table').find('textarea').attr('disabled', false);
            $('#payloadParameterTable').find('textarea').attr('disabled', false);
            $('#location').attr('disabled', false);
            $('#default_tag').attr('disabled', false);
            $('#move_to_payloads_button').attr('disabled', false);
            $('#move_to_commands_button').attr('disabled', false);
            $('#move_to_submit_button').attr('disabled', false);
            $('#move_from_payloads_button').attr('disabled', false);
        },
    },
    delimiters: ['[[',']]']
});
$( document ).unbind('ready').ready(function(){
    //initially populate the c2_profiles section with the available c2profiles for this operation
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles", c2_profile_callback, "GET", null);
     //this gets a lot of information, including the payload types that are associated with each c2profile, so save that all off so we can update appropriately
});

$( '#c2_profile' ).change(function(){
    if( $('#c2_profile').val() != "Select One..."){
        //make a request out to the c2 profile parameters api to get the parameters
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + $('#c2_profile').val() + "/parameters", c2_profile_parameters_callback, "GET", null);
        //now potentially update the payload options section
    }
    else{
        profile_parameters_table.c2_profile_parameters = [];
        profile_parameters_table.payload_parameters = [];
        profile_parameters_table.c2_instance_values = {};
        $( '#payload_type' ).html('<option value="Select One">Select One...</option>');
        $( '#payload_commands' ).html("");
        $('#payloadWrapperRow').prop("hidden", true);
        $('#c2_instance').prop("hidden", true);
        profile_parameters_table.$forceUpdate();
    }
});
$( '#c2_instance').change(function(){
    if( $('#c2_instance').val() != "Select One..."){
        profile_parameters_table.c2_instance_values[$('#c2_instance').val()].forEach(function(x){
            //populate the boxes based on the parameter instance
            //console.log(x);
            profile_parameters_table.c2_profile_parameters.forEach(function(y){
            //console.log(y);
                if(x.c2_profile_key == y.key){
                    y.hint = x.value;
                    //console.log("just set: " + JSON.stringify(y));
                }
            });
            profile_parameters_table.$forceUpdate();
        });
    }else{
        profile_parameters_table.c2_profile_parameters.forEach(function(x){
            //clear the text boxes for all the parameters so they auto fill with the hints again
            x.hint = '';
            //$('#' + x.key).val('');
        });

    }
});
function c2_profile_callback(response){
    // populate the c2_profile select options
   try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    var c2_profile_options = '<option value="Select One...">Select One...</option>';
    for(var i = 0; i < data.length; i ++){
        c2_profile_options = c2_profile_options + '<option value="' + data[i].name + '">' + data[i].name + '</option>';
        //save all of the information off into the global dictionary that we can reference later.
        all_c2_data[data[i].name] = data[i];
    }
    $( '#c2_profile').html(c2_profile_options);
};
function c2_profile_parameters_callback(response){
    //this is called when the c2_profile dropdown changes and we get results back from the GET request
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        // populate the table values
        profile_parameters_table.c2_profile_parameters = []; //clear all the fields first
        for(var i = 0; i < data['c2profileparameters'].length; i++){
            profile_parameters_table.c2_profile_parameters.push(data['c2profileparameters'][i]);
        }
        // we also need to populate the dropdown for the payload_type side
        profile_parameters_table.payload_parameters = [];
        var c2_profile_val = $('#c2_profile').val();
        var payload_type_options = '<option value="Select One...">Select One...</option>';
        for(var i = 0; i < all_c2_data[c2_profile_val]['ptype'].length; i++){
            payload_type_options = payload_type_options + '<option value="' + all_c2_data[c2_profile_val]['ptype'][i] +
            '">' + all_c2_data[c2_profile_val]['ptype'][i] + '</option>';
        }
        $( '#payload_type').html(payload_type_options);
        //check to see if there are any c2 instances associated with this c2 profile
        $( '#c2_instance' ).prop('hidden', true);
        profile_parameters_table.c2_instance_values = {};
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + $('#c2_profile').val() + "/parameter_instances/", c2_instances_callback, "GET", null);
    }
    else{
        alertTop("danger", data['error']);
    }
};
function c2_instances_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        if(Object.keys(data['instances']).length != 0){
            Object.keys(data['instances']).forEach(function(k){
                Vue.set(profile_parameters_table.c2_instance_values, k, data['instances'][k]);
            });
            //profile_parameters_table.c2_instance_values = data['instances'];
            $('#c2_instance').prop('hidden', false);
        }
    }
}
$( '#payload_type' ).change(function(){
    // when this changes we need to get the available parameters and commands for this payload type
    //do a request to get the commands which will asynchronously populate the '#payload_commands' select multiple field
    if( $('#payload_type').val() != "Select One..."){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + $('#payload_type').val() + "/commands", commands_callback, "GET", null);
        // potentially get the create transforms for the payload type
        profile_parameters_table.payload_parameters = [];
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/bytype/" + $('#payload_type').val(), payload_type_create_transforms_callback, "GET", null);
    }
    else{
        //clear all the data
        $('#payloadWrapperRow').prop("hidden", true);
        $( '#payload_commands' ).html("");
        profile_parameters_table.payload_parameters = [];
    }
    //do a request to get all the parameters for the payload_type which will populate the 'payload_parameters' variable here

});
function payload_type_create_transforms_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        //console.log(data['transforms']);
        for(i in data['transforms']){
            if(data['transforms'][i]['t_type'] == "create"){
                profile_parameters_table.payload_parameters.push(data['transforms'][i]);
            }
        }
        profile_parameters_table.payload_parameters.sort((a,b) =>(b.order > a.order) ? -1 : ((a.order > b.order) ? 1 : 0));
    }else{
        alertTop("danger", data['error']);
    }
}
function commands_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    cmd_options = '';
    if(data['status'] == 'success'){
        for(var i = 0; i < data['commands'].length; i++){
            cmd_options = cmd_options + '<option value="' + data['commands'][i]['cmd'] + '">' + data['commands'][i]['cmd'] + '</option>';
        }
        $( '#payload_commands' ).html(cmd_options);
        //now we need to get information about this payload type besides just the commands
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + $('#payload_type').val(), payload_type_callback, "GET", null);
    }
    else{
        alertTop("danger", data['error']);
    }

};
function payload_type_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
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
}
function wrapped_payloads_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        //now we should have a list of already created payloads, in our current operation, of the appropriate type that we can select from
        var options = "<option name='a'>Select One...</option>";
        for(var i = 0; i < data["payloads"].length; i++){
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
    if($('#wrappedPayload').val() != "Select One..."){
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
    if(data['status'] == "success"){
        //update the selected commands along the right hand side based on teh payload selected
        var selected_options = "";
        for(var i = 0; i < data['commands'].length; i++){
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
function submit_payload(){
    var data = {"payload_type": $('#payload_type').val(), "c2_profile": $('#c2_profile').val()};
    if( $('#location').val() != ""){
        data['location'] = $('#location').val();
    }
    if( $('#default_tag').val() != ""){
        data['tag'] = $('#default_tag').val();
    }
    // now get the c2 profile values into a dictionary
    var c2_profile_parameters_dict = {};
    for( i = 0; i < profile_parameters_table.c2_profile_parameters.length; i++){
        var value = $('#' + profile_parameters_table.c2_profile_parameters[i]['key']).val();
        c2_profile_parameters_dict[profile_parameters_table.c2_profile_parameters[i]['name']] = value;
    }
    data['c2_profile_parameters'] = c2_profile_parameters_dict;
    //console.log(data);
    data['commands'] = $('#payload_commands').val();
    data['wrapped_payload'] = $('#wrappedPayload option:selected').attr("name");
    data['transforms'] = profile_parameters_table.payload_parameters;
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create", submit_payload_callback, "POST", data);
    alertTop("info", "Submitted creation request...");
}
var global_uuids = {};
function submit_payload_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        alertTop("info", "Agent " + data['uuid'] + " submitted to the build process...");
        global_uuids[data['uuid']] = false;  // indicate if we've seen the final success/failure message for this yet or not
    }
    else{
        $('#errors').html((data['error']));
        alertTop("danger", "Error: " + data['error']);
    }
}
function startwebsocket_rabbitmq_build_finished(){
var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloads/current_operation');
    ws.onmessage = function(event){
        // sometimes we get teh messages too quickly and so we get the same data twice when querying the db
        if (event.data != ""){
            //console.log(event.data);
            data = JSON.parse(event.data);
            if(global_uuids[data['uuid']] == false){
                if(data['build_phase'] == "success"){
                    alertTop("success", "Success! Your agent, " + data['location'].split("/").pop() + ", was successfully built.<br><b>Execution help:</b> " + data['build_message'] + "<br><b>UUID:</b> " + data['uuid'], 0);
                    global_uuids[data['uuid']] = true;
                }
                else if(data['build_phase'] == "error"){
                    alertTop("danger", "Uh oh, something went wrong.<br><b>Error message:</b> " + data['build_message']);
                    global_uuids[data['uuid']] = true;
                }

            }
        }
    };
    ws.onclose = function(){
        alertTop("danger", "Socked closed. Please reload the page");
    }
    ws.onerror = function(){
        alertTop("danger", "Socket errored. Please reload the page");
    }
};
startwebsocket_rabbitmq_build_finished();