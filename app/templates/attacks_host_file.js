var services = []; //all services data
var hosting_table = new Vue({
    el: '#hosting_table',
    data: {
        services
    },
    methods: {
        start_button: function(host){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/attacks/host_file",
            null, "POST", {'port': host.port, 'directory': host.directory});
            getServices(); //update our information
        },
        stop_button: function(host){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/attacks/host_file/" + host.port.toString(),
            null, "DELETE", null);
            getServices(); //update our information
        }
    },
    delimiters: ['[[',']]']
});
function getServices(){
    services.length = 0;
    var current_services = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/attacks/host_file"));
    for(var i = 0; i < current_services.length; i++){
        services.push(current_services[i]);
    }
}
function create_button(){
    $( '#servicesModal' ).modal('show');
    $( '#servicesSubmit' ).unbind('click').click(function(){
        var port = $( '#servicePort' ).val();
        var dir = $( '#serviceDirectory' ).val();
        //should have all the data we need, submit the POST request
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/attacks/host_file",
        null, "POST", {'port': port, 'directory': dir});
        getServices(); //update our information
    });
}
getServices();