var payloadtypeVue = new Vue({
    el: '#payloadTypesDiv',
    delimiters: ['[[', ']]'],
    data: {
        payloadtypes: [],
        current_type: {},
        commands: []
    }
});
$( document ).unbind('ready').ready(function(){
     httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/", payloadtypes_callback, "GET", null);
});
function payloadtypes_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    payloadtypeVue.payloadtypes = data;
    if(data.length > 0){
        payloadtypeVue.current_type = data[0]; //set the current ptype
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + payloadtypeVue.current_type.ptype + "/commands", payloadtype_commands_callback, "GET", null);
    }

}
$( '#payloadtypeChoice' ).change(function(){
    if( $('#payloadtypeChoice').val() != ""){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + $('#payloadtypeChoice').val() + "/commands", payloadtype_commands_callback, "GET", null);
    }
});
function payloadtype_commands_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        var selected = $('#payloadtypeChoice').val();
        for(var i = 0; i < payloadtypeVue.payloadtypes.length; i++){
            if(selected == payloadtypeVue.payloadtypes[i].ptype){
                payloadtypeVue.current_type = payloadtypeVue.payloadtypes[i];
            }
        }
        payloadtypeVue.commands = data['commands'];
    }else{
        alertTop("danger", data['error']);
    }
}