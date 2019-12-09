var operations = [];
var username = "{{name}}";
var admin = ("{{admin}}" === "True");
var current_operation = "{{current_operation}}";
var operators_vue = new Vue({
    el: '#operationModifyModal',
    data: {
        operation_members: []
    },
    delimiters: ['[[', ']]']
});
var newoperators_vue = new Vue({
    el: '#operationNewModal',
    data: {
        operation_members: []
    },
    delimiters: ['[[', ']]']
});
var operations_table = new Vue({
    el: '#operations_table',
    data: {
        operations,
        current_operation,
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
                operators_vue.operation_members = [];
                var potential_operators = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/"));
            }catch(error){
                alertTop("danger", "Session expired, please refresh");
                return;
            }

            let members = "";
            for(let i = 0; i < potential_operators.length; i++){
                let mem_add = {"name": potential_operators[i]['username'], "selected": false};
                o.members.forEach((x)=>{
                    if(x['username'] === mem_add['name']){
                        mem_add['selected'] = true;
                    }
                });
                operators_vue.operation_members.push(mem_add);
                members = members + '<option value="' + potential_operators[i]['username'] + '">' + potential_operators[i]['username'] + '</option>';
            }
            $( '#operationModifyAdmin' ).html(members);
            $( '#operationModifyName' ).val(o.name);
            $( '#operationModifyWebhook').val(o.webhook);
            $( '#operationModifyAdmin' ).val(o.admin);
            $( '#operationModifyModal' ).modal('show');
		    $( '#operationModifySubmit' ).unbind('click').click(function(){
		        let data = {};
		        if($( '#operationModifyAdmin' ).val() !== o.admin){
		            data['admin'] = $( '#operationModifyAdmin' ).val();
		        }
		        data['webhook'] = $('#operationModifyWebhook').val();
		        let add_members = [];
		        let remove_members = [];
		        for( let i = 0; i < operators_vue.operation_members.length; i++){
		            let to_add = operators_vue.operation_members[i]['selected'];
		            let to_remove = false;
                    o.members.forEach((x)=>{
                        if(x['username'] === operators_vue.operation_members[i]['name']){
                            to_add = false; //they're already in the list, so it's either stay same or remove
                            if(!operators_vue.operation_members[i]['selected']){
                                // we were selected and now aren't
                                to_remove = true;
                            }
                        }
                    });
                    if(to_remove){
                        remove_members.push(operators_vue.operation_members[i]['name']);
                    }else if(to_add) {
                        add_members.push(operators_vue.operation_members[i]['name']);
                    }
                }
		        if(add_members.length > 0){
		            data['add_members'] = add_members;
		        }
		        if(remove_members.length > 0){
		            data['remove_members'] = remove_members;
		        }
		        // make sure the admin didn't get added to the 'remove-users' group
			    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, modify_operation, "PUT", data);
		    });
        },
        modify_acls_button: function(o){
             modify_user_acls.members = o.members;
             $( '#operationModifyACLsModal' ).modal('show');
             $( '#operationModifyACLsSubmit' ).unbind('click').click(function(){
                data = {'add_disabled_commands': []};
                modify_user_acls.members.forEach(function(x){
                    data['add_disabled_commands'].push({"username": x.username, 'base_disabled_commands': x.base_disabled_commands});
                });
                 httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, modify_acls_callback, "PUT", data);
             });
        },
        complete_button: function(o){
            $( '#operationCompleteModal' ).modal('show');
		    $( '#operationCompleteSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/" + o.name, complete_operation, "PUT", {'complete': !o.complete});
            });
        },
        current_operation_button: function(o){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/" + username, current_operation_callback, "PUT", {'current_operation': o.name});
        }
    },
    delimiters: ['[[',']]']
});
function modify_acls_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'success'){
        alertTop("success", "Successfully Updated", 1);
    }else{
        alertTop("danger", data['error']);
    }
}
function modify_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }

    if(data['status'] === "success"){
        for (let i = 0; i < operations.length; i++){
            //console.log(data);
            if(data['old_name']){
                if(operations[i]['name'] === data['old_name']){
                    operations_table.operations[i]['name'] = data['name'];
                    operations_table.operations[i]['webhook'] = data['webhook'];
                    operations_table.operations[i].members = data['members'];
                    operations_table.operations[i].members.forEach(function(x){
                        if(x['base_disabled_commands'] === undefined){x['base_disabled_commands'] = "None";}
                    });
                }
            }
            else if(operations[i]['name'] === data['name']){
                operations_table.operations[i]['webhook'] = data['webhook'];
                operations_table.operations[i].members = data['members'];
                operations_table.operations[i].members.forEach(function(x){
                    if(x['base_disabled_commands'] === undefined){x['base_disabled_commands'] = "None";}
                });
            }
        }
        location.reload(true);
    }
    else{
        alertTop("danger", data['error']);
    }
}
function delete_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
    else{
        for(let i = 0; i < operations.length; i++){
            if(data['name'] === operations[i]['name']){
                operations_table.operations.splice(i, 1);
                if(data['name'] === current_operation){
                    location.reload(true);
                }

            }
        }
    }
}
function create_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
    else{
        operations_table.operations.push(data);
    }
}
function complete_operation(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }
    else{
        for (let i = 0; i < operations.length; i++){
            if(operations[i]['name'] === data['name']){
                operations_table.operations[i].complete = data['complete'];
            }
        }
    }
}
function get_operations(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/", get_operations_callback, "GET", null);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/commands/", get_commands_callback, "GET", null);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profiles", get_disabled_commands_profiles_response, "GET", null);
}
function get_operations_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    for(let i = 0; i < data.length; i++){
        data[i]['members'].forEach(function(x){
            if(x['base_disabled_commands'] === undefined){x['base_disabled_commands'] = "None"};
        });
        Vue.set(operations_table.operations, i, data[i]);
    }
}
function get_disabled_commands_profiles_response(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'success'){
        let profiles = [];
        let i = 0;
        modify_user_acls.denied_command_profiles = [];
        Object.keys(data['disabled_command_profiles']).forEach(function(x){
            object_instance = {"name": x, "id": i, "values": data['disabled_command_profiles'][x]};
            profiles.push(object_instance);
            modify_user_acls.denied_command_profiles.push(x);
            i++;
        });
        view_acls.disabled_profiles = profiles;
    }else{
        alertTop("danger", data['error']);
    }
}
function get_commands_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    for(var i = 0; i < data.length; i++){
        if(!create_acls.command_options.hasOwnProperty(data[i]['payload_type'])){
            create_acls.command_options[data[i]['payload_type']] = [];
        }
        data[i]['disabled'] = false;
        create_acls.command_options[data[i]['payload_type']].push(data[i]);
    }
    Object.keys(create_acls.command_options).forEach(function (x){
        create_acls.command_options[x].sort((a,b) =>(b.cmd > a.cmd) ? -1 : ((a.cmd > b.cmd) ? 1 : 0));
    });
    create_acls.selected_commands = create_acls.command_options;
}
function new_operation_button(){
    $( '#operationNewName' ).val("");
    newoperators_vue.operation_members = [];
    try{
        var potential_operators = JSON.parse(httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators/"));
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    let members = "";
    for(let i = 0; i < potential_operators.length; i++){
        newoperators_vue.operation_members.push({"name": potential_operators[i]['username'], "selected": false});
        members = members + '<option value="' + potential_operators[i]['username'] + '">' + potential_operators[i]['username'] + '</option>';
    }
    $( '#operationNewAdmin' ).html(members);
    $( '#operationNewMembers' ).html(members);
    $( '#operationNewModal' ).modal('show');
    $( '#operationNewSubmit' ).unbind('click').click(function(){
        let data = {};
        data['name'] = $( '#operationNewName' ).val();
        data['admin'] = $( '#operationNewAdmin' ).val();
        data['members'] = [];
        for(let i = 0; i < newoperators_vue.operation_members.length; i++){
            if(newoperators_vue.operation_members[i]['selected']){
                data['members'].push(newoperators_vue.operation_members[i]['name']);
            }
        }
        data['members'] = $( '#operationNewMembers' ).val();
        data['webhook'] = $('#OperationNewWebhook').val();
        if( data['members'] != null && data['members'].length === 0){
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
    if(data['status'] === 'success'){
        operations_table.current_operation = data['current_operation'];
        location.reload(true);
    }
    else{
        alertTop("danger", data['error']);
    }
}
get_operations();
var modify_user_acls = new Vue({
    el: '#operationModifyACLsModal',
    data:{
        members: [],
        denied_command_profiles: []
    },
    delimiters: ['[[',']]']
});
var create_acls = new Vue({
    el: '#operationCreateACLsModal',
    data: {
        command_options: {},
        selected_commands: {},
        name: ""
    },
    delimiters: ['[[',']]']
});
var view_acls = new Vue({
    el: '#view_acls',
    data: {
        disabled_profiles: []
    },
    methods: {
        toggle_arrow: function(instid){
            $('#cardbody' + instid).on('shown.bs.collapse', function(){
                $('#color-arrow' + instid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + instid).on('hidden.bs.collapse', function(){
                $('#color-arrow' + instid).css("transform", "rotate(0deg)");
            });
        },
        delete_instance: function(instance){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profiles/" + instance.name, delete_acl_response, "DELETE", null);
        },
        edit_profile: function(instance){
            // set all of the current disable flags to match the instance in the create_acls Vue instance
            create_acls.name = instance.name;
            // reset all to not disabled
            Object.keys(create_acls.selected_commands).forEach(function(x){
                //looping through payload types, x is payload type name
                create_acls.selected_commands[x].forEach(function(y){
                    y.disabled = false;
                });
            });
            // mark the instances one as disabled
            Object.keys(instance['values']).forEach(function(x){
                //looping through payload types, x is payload type name
                instance['values'][x].forEach(function(y){
                    create_acls.selected_commands[x].forEach(function(z){
                        if(z.cmd == y.command){
                            z.disabled = true;
                        }
                    });
                });
            });
            $( '#operationCreateACLsModal' ).modal('show');
            $( '#operationCreateACLsSubmit' ).unbind('click').click(function(){
                data = {};
                data[create_acls.name] = {};
                for (const [key, value] of Object.entries(create_acls.selected_commands)) {
                  // key will be a payload type
                  for(i = 0; i < value.length; i++){
                        //found a thing we need to add
                        if(!data[create_acls.name].hasOwnProperty(key)){
                            data[create_acls.name][key] = [];
                        }
                        data[create_acls.name][key].push(value[i]);
                  }
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profile", create_acl_response, "PUT", data);

            });
        }
    },
    delimiters: ['[[', ']]']
});
function delete_acl_response(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'error'){
        alertTop("danger", data['error']);
    }else{
        for(let i = 0; i < view_acls.disabled_profiles.length; i++){
            if(data['name'] === view_acls.disabled_profiles[i]['name']){
                view_acls.disabled_profiles.splice(i, 1);
                break;
            }
        }
        for(let i = 0; i < modify_user_acls.denied_command_profiles.length; i++){
            if(data['name'] === modify_user_acls.denied_command_profiles[i]){
                modify_user_acls.denied_command_profiles.splice(i, 1);
                return;
            }
        }
    }
}
function new_acl_button(){
     $( '#operationCreateACLsModal' ).modal('show');
     $( '#operationCreateACLsSubmit' ).unbind('click').click(function(){
        let data = {};
        data[create_acls.name] = {};
        for (const [key, value] of Object.entries(create_acls.selected_commands)) {
          // key will be a payload type
          for(let i = 0; i < value.length; i++){
                if(value[i]['disabled']){
                    //found a thing we need to add
                    if(!data[create_acls.name].hasOwnProperty(key)){
                        data[create_acls.name][key] = [];
                    }
                    data[create_acls.name][key].push(value[i]['cmd']);
                }
          }
        }
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profile", create_acl_response, "POST", data);
     });
}
function create_acl_response(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] === 'success'){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operations/disabled_commands_profiles", get_disabled_commands_profiles_response, "GET", null);
    }else{
        alertTop("danger", data['error']);
    }
}