var operators = [];
var current_operator = JSON.parse(pythonToJSJson("{{op}}")); //information about the current operator
var operator = new Vue({
    el: '#page_heading',
    data: {
        current_operator
    },
    delimiters: ['[[', ']]']
});
var operators_table = new Vue({
    el: '#operators_table',
    data: {
        operators,
        current_operator
    },
    delimiters: ['[[', ']]'],
    methods: {
        delete_operator_button: function(o){
            delete_button(o);
        },
        change_admin_button: function(o){
            if(o.username == 'apfell_admin'){
                alert("Cannot make apfell_admin not an admin");
            }
            else{
                data = {};
                if(o['admin'] == false){
                    data['admin'] = true;
                }
                else{
                    data['admin'] = false;
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.username, update_operatorview_callback, "PUT", data);
            }
        },
        set_password_button: function(o){
            password_button(o);
        },
        change_username_button: function(o){
            username_button(o);
        },
        change_active_button: function(o){
        data = {};
                if(o['active'] == false){
                    data['active'] = true;
                }
                else{
                    data['active'] = false;
                }
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.username, update_operatorview_callback, "PUT", data);
        },
        change_config_button: function(o){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.username, get_config_button_callback, "GET", null);
            $('#operatorConfigModal').modal('show');
            $('#operatorConfigSubmit').unbind('click').click(function(){
                var config = {};
                for(var i = 0; i < operator_config.config.length; i++){
                    config[operator_config.config[i]["key"]] = operator_config.config[i]["value"];
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.username, get_set_config_button_callback, "PUT", {"ui_config": JSON.stringify(config)});
            });
        }
    }
});
function get_config_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session is expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        //operator_config.config = JSON.parse(data['ui_config']);
        config_data = JSON.parse(data['ui_config']);
        operator_config.config = [];
        for(key in config_data){
            operator_config.config.push({"key": key, "value": config_data[key]});
        }
    }else{
        alertTop("danger", data['error']);
    }

}
function get_set_config_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session is expired, please refresh");
        return;
    }
    if(data['status'] == "success"){
        //operator_config.config = JSON.parse(data['ui_config']);
        location.reload(true);
    }else{
        alertTop("danger", data['error']);
    }

}
var operator_config = new Vue({
    el: '#operatorConfigModal',
    data: {
        config: []
    },
    methods: {
        add_key_config: function(){
            this.config.push({"key": "", "value": ""});
        },
        remove_key_config: function(key){
            for(var i = 0; i < this.config.length; i++){
                if(key == this.config[i]["key"]){
                    this.config.splice(i, 1);
                }
            }
        },
        get_default_config: function(){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/config/default", get_static_config_button_callback, "GET", null);
        },
        get_dark_config: function(){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/config/dark", get_static_config_button_callback, "GET", null);
        }
    },
    delimiters: ['[[',']]']
});
function get_static_config_button_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        delete data['status'];
        operator_config.config = [];
        config_data = JSON.parse(data['config']);
        for(key in config_data){
            operator_config.config.push({"key": key, "value": config_data[key]});
        }
    }
    else{
        alertTop("danger", data['error']);
    }
}
function startwebsocket_operators(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/operators');
	ws.onmessage = function(event){
		if(event.data != ""){
			odata = JSON.parse(event.data);
			operators.push(odata);

		}
	}
}
function startwebsocket_updatedoperators(){
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedoperators');
	ws.onmessage = function(event){
		if(event.data != ""){
			odata = JSON.parse(event.data);
            for (var i = 0; i < operators.length; i++){
                if (operators[i].id == odata['id']){
                    Vue.set(operators, i, odata);
                    break;
                }
            }

		}
	}
}
if(current_operator['admin']){
    // only an admin can see all the registered users, everybody else just knows of themselves
    startwebsocket_operators();
    startwebsocket_updatedoperators();
}
function username_button(op){
    $( '#operatorNewUsername' ).val("");
    $( '#operatorUsernameModal' ).modal('show');
    $( '#operatorUsernameSubmit' ).unbind('click').click(function(){
        data = {};
        if($( '#operatorNewUsername' ).val() != "" && op['username'] != 'apfell_admin'){
            data['username'] = $( '#operatorNewUsername' ).val();
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.username, update_operatorview_callback, "PUT", data);
         }
         else{
            alert("Cannot change name to empty or change the name of apfell_admin");
         }
    });
}
function password_button(op){
    $( '#operatorNewPassword1').val("");
    $( '#operatorNewPassword2').val("");
    $( '#operatorOldPassword').val("");
    $( '#operatorPasswordModal' ).modal('show');
    $( '#operatorPasswordSubmit' ).unbind('click').click(function(){
        data = {};
        if(current_operator['admin']){
            data['old_password'] = "Empty";
        }
        if($( '#operatorNewPassword1' ).val() != $( '#operatorNewPassword2' ).val()){
            alert("New passwords don't match!");
        }
        else{
            data['old_password'] = $('#operatorOldPassword').val();
            data['password'] = $( '#operatorNewPassword1' ).val();
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.username, update_operator_callback, "PUT", data);
        }
    });
}
function config_button(o){
    operator_config.config = [];
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.username, get_config_button_callback, "GET", null);
    $('#operatorConfigModal').modal('show');
    $('#operatorConfigSubmit').unbind('click').click(function(){
        var config = {};
        for(var i = 0; i < operator_config.config.length; i++){
            config[operator_config.config[i]["key"]] = operator_config.config[i]["value"];
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + o.username, get_set_config_button_callback, "PUT", {"ui_config": JSON.stringify(config)});
    });
}
function delete_button(op){
    $( '#operatorDeleteModal' ).modal('show');
    $( '#operatorDeleteSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.username, delete_operator_callback, "DELETE", null);
    });
}
function delete_operator_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
	if(data['status'] == 'success'){
        var i = 0;
		for( i = 0; i < operators.length; i++){
		    if(operators[i].username == data['username']){
		        break;
		    }
		}
		operators.splice(i, 1);
		if(operators.length == 0){
		    //there's nobody left, so go to logout page
		    window.location = "{{http}}://{{links.server_ip}}:{{links.server_port}}/logout";
		}
	}
	else{
		//there was an error, so we should tell the user
		alertTop("danger", "Error: " + data['error']);
	}
}
function update_operator_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        alertTop("success", "Password successfully changed");
    }
    else{
        alertTop("danger", "Error: " + data['error']);
    }
}
function update_operatorview_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        alertTop("success", "success");
    }
    else{
        alertTop("danger", "Error: " + data['error']);
    }
}
function disable_registration_button(){
    var data = {'registration': false};
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/settings", disable_registration_callback, "PUT", data);
}
function disable_registration_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        alertTop("warning", "New operator registration is disabled until server restart.");
    }
    else{
        alertTop("danger", data['error']);
    }
}