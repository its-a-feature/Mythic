var operations = [];
var username = "{{name}}";
var admin = ("{{admin}}" === "True");
var current_operation = "{{current_operation}}";
var operations_table = new Vue({
    el: '#operations_table',
    data: {
        operations,
        current_operation
    },
    methods: {
        delete_button: function(o){
            $( '#operationDeleteModal' ).modal('show');
		    $( '#operationDeleteSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, delete_operation, "DELETE", null);
            });
        },
        modify_button: function(o){
            try{
                var potential_operators = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/"));
            }catch(error){
                alertTop("danger", "Session expired, please refresh");
                return;
            }

            var members = "";
            for(var i = 0; i < potential_operators.length; i++){
                members = members + '<option value="' + potential_operators[i]['username'] + '">' + potential_operators[i]['username'] + '</option>';
            }
            $( '#operationModifyAdmin' ).html(members);
            $( '#operationModifyMembers' ).html(members);
            $( '#operationModifyName' ).val(o.name);
            $( '#operationModifyAdmin' ).val(o.admin);
            $( '#operationModifyMembers' ).val(o.members);
            $( '#operationModifyModal' ).modal('show');
		    $( '#operationModifySubmit' ).unbind('click').click(function(){
		        var data = {};
		        if($( '#operationModifyName' ).val() != o.name){
		            data['name'] = $( '#operationModifyName' ).val();
		        }
		        if($( '#operationModifyAdmin' ).val() != o.admin){
		            data['admin'] = $( '#operationModifyAdmin' ).val();
		        }
		        new_members = $( '#operationModifyMembers' ).val();
		        add_users = [];
		        remove_users = [];
		        for( var i = 0; i < new_members.length; i++){
		            if(o.members.indexOf(new_members[i]) == -1){
		                add_users.push(new_members[i]);
		            }
		        }
		        if(add_users.length > 0){
		            data['add_users'] = add_users;
		        }
		        for(var i = 0; i < o.members.length; i++){
		            if(new_members.indexOf(o.members[i]) == -1){
		                remove_users.push(o.members[i]);
		            }
		        }
		        if(remove_users.length > 0){
		            data['remove_users'] = remove_users;
		        }
		        // make sure the admin didn't get added to the 'remove-users' group
			    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, modify_operation, "PUT", data);
		    });
        },
        complete_button: function(o){
            $( '#operationCompleteModal' ).modal('show');
		    $( '#operationCompleteSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, complete_operation, "PUT", {'complete': true});
            });
        },
        current_operation_button: function(o){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + username, current_operation_callback, "PUT", {'current_operation': o.name});
        }
    },
    delimiters: ['[[',']]']
});
function modify_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }

    if(data['status'] == "success"){
        for (var i = 0; i < operations.length; i++){
            if(data['old_name']){
                if(operations[i]['name'] == data['old_name']){
                    operations_table.operations[i]['name'] = data['name'];
                    operations_table.operations[i].members = data['operators'];
                }
            }
            else if(operations[i]['name'] == data['name']){
                operations_table.operations[i].members = data['operators'];
            }
        }
    }
    else{
        alert(data['error']);
    }
};
function delete_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        for(i = 0; i < operations.length; i++){
            if(data['name'] == operations[i]['name']){
                operations_table.operations.splice(i, 1);
                if(data['name'] == current_operation){
                    location.reload(true);
                }

            }
        }
    }
};
function create_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        operations_table.operations.push(data);
    }
};
function complete_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'error'){
        alertTop("danger", data['error']);
    }
    else{
        for (var i = 0; i < operations.length; i++){
            if(operations[i]['name'] == data['name']){
                operations_table.operations[i].complete = true;
            }
        }
    }
};
function get_operations(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", get_operations_callback, "GET", null);
};
function get_operations_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    for(var i = 0; i < data.length; i++){
        Vue.set(operations_table.operations, i, data[i]);
    }
};
function new_operation_button(){
    $( '#operationNewName' ).val("");
    try{
        var potential_operators = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/"));
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    var members = "";
    for(var i = 0; i < potential_operators.length; i++){
        members = members + '<option value="' + potential_operators[i]['username'] + '">' + potential_operators[i]['username'] + '</option>';
    }
    $( '#operationNewAdmin' ).html(members);
    $( '#operationNewMembers' ).html(members);
    $( '#operationNewModal' ).modal('show');
    $( '#operationNewSubmit' ).unbind('click').click(function(){
        data = {};
        data['name'] = $( '#operationNewName' ).val();
        data['admin'] = $( '#operationNewAdmin' ).val();
        data['members'] = $( '#operationNewMembers' ).val();
        if( data['members'] != null && data['members'].length == 0){
            delete data['members'];
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", create_operation, "POST", data);
    });

};
function current_operation_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        operations_table.current_operation = data['current_operation'];
        location.reload(true);
    }
    else{
        alertTop("danger", data['error']);
    }
};
get_operations();