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
        }
    }
});

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
            data['password'] = $( '#operatorNewPassword1' ).val();
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.username, update_operator_callback, "PUT", data);
        }
    });
}
function delete_button(op){
    $( '#operatorDeleteModal' ).modal('show');
    $( '#operatorDeleteSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + op.username, delete_operator_callback, "DELETE", null);
    });
}
function delete_operator_callback(response){
    data = JSON.parse(response);
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
		alert("Error: " + data['error']);
	}
}
function update_operator_callback(response){
    data = JSON.parse(response);
    if(data['status'] == 'success'){
        alert("Password successfully changed");
    }
    else{
        alert("Error: " + data['error']);
    }
}
function update_operatorview_callback(response){
    data = JSON.parse(response);
    if(data['status'] == 'success'){

    }
    else{
        alert("Error: " + data['error']);
    }
}
function disable_registration_button(){
    var data = {'registration': false};
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/settings", disable_registration_callback, "PUT", data);
}
function disable_registration_callback(response){
    data = JSON.parse(response);
    if(data['status'] == 'success'){
        alert("New operator registration is disabled until server restart.");
    }
    else{
        alert(data['error']);
    }
}