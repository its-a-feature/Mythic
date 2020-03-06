document.title = "Command Help";
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
        pdata = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    payloadtypeVue.payloadtypes = pdata;
    if(pdata.length > 0){
        if( "{{agent}}" !== ""){
             //payloadtypeVue.current_type = "{{agent}}";
             for(let i = 0; i < pdata.length; i++){
                 if("{{agent}}" === pdata[i]['ptype']){
                     payloadtypeVue.current_type = pdata[i];
                 }
             }
         }else{
            payloadtypeVue.current_type = pdata[0]; //set the current ptype
        }
        payloadtypeVue.$forceUpdate();
        //console.log(payloadtypeVue.current_type);
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + payloadtypeVue.current_type.ptype + "/commands", payloadtype_commands_callback, "GET", null);
    }
}
$( '#payloadtypeChoice' ).change(function(){
    if( $('#payloadtypeChoice').val() !== ""){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + payloadtypeVue.current_type.ptype + "/commands", payloadtype_commands_callback, "GET", null);
    }
});
function payloadtype_commands_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    //console.log(data);
    if(data['status'] === 'success'){
        let selected = $('#payloadtypeChoice').val();
        for(let i = 0; i < payloadtypeVue.payloadtypes.length; i++){
            if(selected === payloadtypeVue.payloadtypes[i].ptype){
                payloadtypeVue.current_type = payloadtypeVue.payloadtypes[i];
            }
        }
        payloadtypeVue.commands = data['commands'];
    }else{
        alertTop("danger", data['error']);
    }
}