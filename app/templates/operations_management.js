var operations = [];
var username = "{{name}}";
var admin = ("{{admin}}" === "True");
var operations_table = new Vue({
    el: '#operations_table',
    data: {
        operations
    },
    methods: {
        delete_button: function(o){
            $( '#operationDeleteModal' ).modal('show');
		    $( '#operationDeleteSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, delete_operation, "DELETE", null);
            });
        },
        modify_button: function(o){
            $( '#operationModifyName' ).val(o.name);
            $( '#operationModifyAdmin' ).val(o.admin);
            $( '#operationModifyMembers' ).val(o.members.join(", "));
            $( '#operationModifyModal' ).modal('show');
		    $( '#operationModifySubmit' ).unbind('click').click(function(){
		        var data = {};
		        if($( '#operationModifyName' ).val() != o.name){
		            data['name'] = $( '#operationModifyName' ).val();
		        }
		        if($( '#operationModifyAdmin' ).val() != o.admin){
		            data['admin'] = $( '#operationModifyAdmin' ).val();
		        }
		        new_members = $( '#operationModifyMembers' ).val().split(",");
		        for(var i = 0; i < new_members.length; i++){
		            new_members[i] = new_members[i].trim();  // remove potential spaces
		        }
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
			    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, modify_operation, "PUT", data);
		    });
        },
        complete_button: function(o){
            $( '#operationCompleteModal' ).modal('show');
		    $( '#operationCompleteSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, complete_operation, "PUT", {'complete': true});
            });
        }
    },
    delimiters: ['[[',']]']
});
function modify_operation(response){
    data = JSON.parse(response);
    if(data['status'] == "success"){
        for (var i = 0; i < operations.length; i++){
            if(operations[i]['name'] == data['name']){
                operations_table.operations[i].members = data['operators'];
            }
        }
    }
    else{
        alert(data['error']);
    }
};
function delete_operation(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alert(data['error']);
    }
    else{
        for(i = 0; i < operations.length; i++){
            if(data['name'] == operations[i]['name']){
                operations_table.operations.splice(i, i);
            }
        }
    }
};
function create_operation(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alert(data['error']);
    }
    else{
        operations_table.operations.push(data);
    }
};
function complete_operation(response){
    data = JSON.parse(response);
    if(data['status'] == 'error'){
        alert(data['error']);
    }
    else{
        for (var i = 0; i < operations.length; i++){
            if(operations[i]['name'] == data['name']){
                operations_table.operations[i].complete = true;
            }
        }
    }
}
function get_operations(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", get_operations_callback, "GET", null);
};
function get_operations_callback(response){
    data = JSON.parse(response);
    for(var i = 0; i < data.length; i++){
        Vue.set(operations_table.operations, i, data[i]);
    }
}
function new_operation_button(){
    $( '#operationNewName' ).val("");
    $( '#operationNewAdmin' ).val("");
    $( '#operationNewMembers' ).val("");
    $( '#operationNewModal' ).modal('show');
    $( '#operationNewSubmit' ).unbind('click').click(function(){
        data = {};
        data['name'] = $( '#operationNewName' ).val();
        data['admin'] = $( '#operationNewAdmin' ).val();
        data['members'] = [];
        members = $( '#operationNewMembers' ).val().split(",");
        for(var i = 0; i < members.length; i++){
            if(members[i].trim() != ""){
                data['members'].push(members[i].trim());
            }
        }
        if( data['members'].length == 0){
            delete data['members'];
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", create_operation, "POST", data);
    });

};
get_operations();