var c2_profile_parameters = []; //all c2 profile parameter data
var payload_parameters = []; //all payload parameter data
var all_c2_data = {};
var username = "{{name}}";
var profile_parameters_table = new Vue({
    el: '#payloadCreation',
    data: {
        c2_profile_parameters,
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
        profile_parameters_table.c2_profile_parameters.length = 0;
        Vue.set(profile_parameters_table.c2_profile_parameters, []);
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
        profile_parameters_table.payload_parameters = [];
        var c2_profile_val = $('#c2_profile').val();
        var payload_type_options = '<option value="Select One...">Select One...</option>';
        for(var i = 0; i < all_c2_data[c2_profile_val]['ptype'].length; i++){
            payload_type_options = payload_type_options + '<option value="' + all_c2_data[c2_profile_val]['ptype'][i] +
            '">' + all_c2_data[c2_profile_val]['ptype'][i] + '</option>';
        }
        $( '#payload_type').html(payload_type_options);
    }
    else{
        alertTop("danger", data['error']);
    }
};
function create_instance(){
    if(profile_parameters_table.c2_profile_parameters.length > 0){
        var ptype = $('#payload_type').val();
        if(ptype != "Select One..."){
            var data = {'c2_profile': $('#c2_profile').val()};
            for(var i = 0; i < profile_parameters_table.c2_profile_parameters.length; i++){
                var p = profile_parameters_table.c2_profile_parameters[i];
                var value = $('#' + p['key']).val();
                if (value == ""){
                    value = p['hint'];
                }
                data[p['name']] = value;
            }
             data['ptype'] = ptype;
             httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/create_instance", create_instance_callback, "POST", data);
        }
        else{
            alertTop("warning", "Need to select a payload type");
        }
    }
    else{
        alertTop("warning", "Need to select a profile first");
    }
};
function create_instance_callback(response){
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
        alertTop("success", "Created instance with file_id: " + data['id']);
    }
}