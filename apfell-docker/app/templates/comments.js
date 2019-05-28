var comments_by_callback = new Vue({
    el: '#outputByCallback',
    delimiters: ['[[', ']]'],
    data: {
        callbacks: []
    },
    methods: {
        add_comment: function(task){
            $( '#addCommentTextArea' ).val(task.comment);
            $( '#addCommentModal' ).modal('show');
            $( '#addCommentSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, update_callback_comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        toggle_show_params: function(id){
            var img = document.getElementById("toggle_task" + id).nextElementSibling;
            if (img.style.display === "") {
                img.style.display = "none";
            } else {
                img.style.display = "";
            }
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, update_callback_comment_callback, "DELETE", null);
        }
    }
});
function comments_by_callback_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        comments_by_callback.callbacks = data['callbacks'];
        $("#top-alert").fadeTo(2000, 500).slideUp(500, function(){
              $("#top-alert").slideUp(500);
        });
    }
}
function update_callback_comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        data = data['task'];
        for(var i = 0; i < comments_by_callback.callbacks.length; i++){
            for(var j = 0; j < comments_by_callback.callbacks[i].tasks.length; j++){
                if(comments_by_callback.callbacks[i].tasks[j].id == data['id']){
                    Vue.set(comments_by_callback.callbacks[i].tasks, j, Object.assign({}, comments_by_callback.callbacks[i].tasks[j], data));
                    $("#top-alert").fadeTo(2000, 500).slideUp(500, function(){
                          $("#top-alert").slideUp(500);
                    });
                    return;
                }
            }
        }
    }
}


var comments_by_operator = new Vue({
    el: '#outputByOperator',
    delimiters: ['[[', ']]'],
    data: {
        operators: []
    },
    methods: {
        add_comment: function(task){
            $( '#addCommentTextArea' ).val(task.comment);
            $( '#addCommentModal' ).modal('show');
            $( '#addCommentSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, update_operator_comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        toggle_show_params: function(id){
            var img = document.getElementById("toggle_task" + id).nextElementSibling;
            if (img.style.display === "") {
                img.style.display = "none";
            } else {
                img.style.display = "";
            }
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, update_operator_comment_callback, "DELETE", null);
        }
    }
});
function update_operator_comment_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        data = data['task'];
        for(var i = 0; i < comments_by_operator.operators.length; i++){
            for(var j = 0; j < comments_by_operator.operators[i].callbacks.length; j++){
                for(var k = 0; k < comments_by_operator.operators[i].callbacks[j].tasks.length; k++){
                    if(comments_by_operator.operators[i].callbacks[j].tasks[k].id == data['id']){
                        Vue.set(comments_by_operator.operators[i].callbacks[j].tasks, k, Object.assign({}, comments_by_operator.operators[i].callbacks[j].tasks[k], data));
                        $("#top-alert").fadeTo(2000, 500).slideUp(500, function(){
                              $("#top-alert").slideUp(500);
                        });
                        return;
                    }
                }

            }
        }
    }
}
function comments_by_operator_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        comments_by_operator.operators = data['operators'];
        $("#top-alert").fadeTo(2000, 500).slideUp(500, function(){
              $("#top-alert").slideUp(500);
        });
    }
}

httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/by_operator", comments_by_operator_callback, "GET", null);

function view_by_operator(){
    comments_by_callback.callbacks = [];
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/by_operator", comments_by_operator_callback, "GET", null);
    alertTop("info", "Sorting by operator...");
}
function view_by_callback(){
    comments_by_operator.operators = [];
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/by_callback", comments_by_callback_callback, "GET", null);
    alertTop("info", "Sorting by callback...");
}

function search_comments(){
    var search = $( '#searchTextField' ).val();
    if(search != undefined && search != ""){
        comments_by_callback.callbacks = [];
        comments_by_operator.operators = [];
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/search", comments_by_callback_callback, "POST", {"search": search});
        alertTop("info", "Searching...");
    }
}