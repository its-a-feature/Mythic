
var creds_div = new Vue({
    el: '#creds_div',
    data: {
        credentials: []
    },
    methods: {
        register_new_credential: function(){
            $('#createCredentialModal').modal('show');
            $('#createCredentialSubmit').unbind('click').click(function(){
                var data = {"type": $('#createCredentialType').val(),
                "user": $('#createCredentialUser').val(),
                "domain": $('#createCredentialDomain').val(),
                "credential": $('#createCredentialCredential').val()};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials",
                    new_credential_callback, "POST", data);
            });
        },
        remove_credential: function(domain, cred, index){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials/" + cred['id'],
                    remove_credential_callback, "DELETE", null);
        }
    },
    delimiters: ['[[',']]']
});
function new_credential_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != "success"){
        alertTop("danger", "Error creating a new credential: " + data['error']);
    }
}
function remove_credential_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        for(var i = 0; i < creds_div.credentials[data['domain']].length; i++){
            if(data['id'] == creds_div.credentials[data['domain']][i]['id']){
                creds_div.credentials[data['domain']].splice(i, 1);
                return;
            }
        }
    }
    else{
        alertTop("danger", "Error: " + data['error']);
    }
}
function startwebsocket_credentials(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/credentials/current_operation');
    ws.onmessage = function(event){
        if (event.data != ""){
            c = JSON.parse(event.data);
            creds_div.credentials.push(c);
        }
    };
    ws.onclose = function(){
        //console.log("socket closed");
        alertTop("danger", "Session expired, please refresh");
    }
    ws.onerror = function(){
        //console.log("websocket error");
        alertTop("danger", "Session expired, please refresh");
    }
    ws.onopen = function(event){
        //console.debug("opened");
    }
};
startwebsocket_credentials();