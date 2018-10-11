var profiles = []; //all profiles data
var username = "{{name}}";
var finished_profiles = false;
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
	        var possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
            var types = "";
            for(var i = 0; i < possiblePayloadTypes.length; i++){
                types = types + '<option value="' + possiblePayloadTypes[i].ptype + '">'
                + possiblePayloadTypes[i].ptype + '</option>';
            }
            $( '#profileUpdatePayloads' ).html(types);
            // before we show the fields, populate them with the current data
            $( '#profileUpdateName' ).val(p.name);
            $( '#profileUpdateDescription' ).val(p.description);
            $( '#profileUpdatePayloads').val(p.payload_types);
            $( '#profileUpdateModal' ).modal('show');
            $( '#profileUpdateSubmit' ).unbind('click').click(function(){
                var data = {"name": p.name,
                        "description": $( '#profileUpdateDescription' ).val(),
                        "payload_types": $( '#profileUpdatePayloads' ).val()
                        };
                 httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name, update_profile, "PUT", data);
		    });
	    },
	    running_button: function(p){
	        if (p.running){
	            command = "stop";
	        }
	        else{
	            command = "start";
	        }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/" + p.name + "/" + command, update_profile, "GET", null);
	    }
    },
    delimiters: ['[[',']]']
});
function update_profile(response){
	data = JSON.parse(response);
	if(data['status'] == 'success'){
		for( var i = 0; i < profiles.length; i++){
		    if(profiles[i].id == data['id']){
		        profiles[i].name = data['name'];
		        profiles[i].description = data['description'];
		        profiles[i].payload_types = data['payload_types'];
		        profiles[i].running = data['running'];
		    }
		}
	}
	else{
		//there was an error, so we should tell the user
		alert("Error: " + data['error']);
	}
}
function delete_profile(response){
	data = JSON.parse(response);
	if(data['status'] == 'success'){
        var i = 0;
		for( i = 0; i < profiles.length; i++){
		    if(profiles[i].name == data['name']){
		        break;
		    }
		}
		profiles.splice(i, 1);
	}
	else{
		//there was an error, so we should tell the user
		alert("Error: " + data['error']);
	}
}
function create_profile(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alert(data['error']);
    }
}
function startwebsocket_c2profiles(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/c2profiles/current_operation');
	ws.onmessage = function(event){
		if(event.data != ""){
			pdata = JSON.parse(event.data);
			pdata['payload_types'] = [];
			profiles.push(pdata);
		}
		else{
		    if(finished_profiles == false){
		        finished_profiles = true;
		        startwebsocket_payloadtypec2profile();
		    }
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}
function startwebsocket_payloadtypec2profile(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/payloadtypec2profile');
	ws.onmessage = function(event){
		if(event.data != ""){
			pdata = JSON.parse(event.data);
			//profiles.push(pdata);
            for(var i = 0; i < profiles.length; i++){
                if(profiles[i]['id'] == pdata['c2_profile_id']){
                    if( !profiles[i]['payload_types'].includes(pdata['payload_type'])){
                        profiles[i]['payload_types'].push(pdata['payload_type']);
                    }
                }
            }
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}
function register_button(){
    var possiblePayloadTypes = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/"));
    console.log(possiblePayloadTypes);
    var types = "";
    for(var i = 0; i < possiblePayloadTypes.length; i++){
        types = types + '<option value="' + possiblePayloadTypes[i].ptype + '">'
        + possiblePayloadTypes[i].ptype + '</option>';
    }
    $( '#profileCreatePayloadTypes' ).html(types);


	$( '#profileCreateModal' ).modal('show');
    $( '#profileCreateSubmit' ).unbind('click').click(function(){
        var data = {"name": $( '#profileCreateName' ).val(),
                    "description": $( '#profileCreateDescription' ).val(),
                    "payload_types": $( '#profileCreatePayloadTypes' ).val()};
         httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/c2profiles/", create_profile, "POST", data);

    });
}
startwebsocket_c2profiles();
