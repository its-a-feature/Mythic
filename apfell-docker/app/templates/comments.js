try{
    var support_scripts = { {{support_scripts}} };
}catch(error){
    alertTop("danger", "Support Scripting error: " + error.toString());
}
try{
    var browser_scripts = { {{browser_scripts}} };
}catch(error){
    alertTop("danger", "Browser Scripting error: " + error.toString());
}

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
        toggle_arrow: function(taskid){
            $('#cardbody' + taskid).on('shown.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + taskid).on('hidden.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(0deg)");
            });
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, update_callback_comment_callback, "DELETE", null);
        },
        update_view: function(){
            this.$forceUpdate();
        },
        copyStringToClipboard: function (str) {
          // Create new element
          var el = document.createElement('textarea');
          // Set value (string to be copied)
          el.value = str;
          // Set non-editable to avoid focus and move outside of view
          el.setAttribute('readonly', '');
          el.style = {position: 'absolute', left: '-9999px'};
          document.body.appendChild(el);
          // Select text inside element
          el.select();
          // Copy text to clipboard
          document.execCommand('copy');
          // Remove temporary element
          document.body.removeChild(el);
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
        //console.log(data['callbacks']);
        alertTop("success", "Finished", 1);
        for(i = 0; i < data['callbacks'].length; i++){
            for(j = 0; j < data['callbacks'][i]['tasks'].length; j++){
                data['callbacks'][i]['tasks'][j]['use_scripted'] = false;
                if(browser_scripts.hasOwnProperty(data['callbacks'][i]['tasks'][j]['command_id'])){
                    data['callbacks'][i]['tasks'][j]['use_scripted'] = true;
                    data['callbacks'][i]['tasks'][j]['scripted'] = browser_scripts[data['callbacks'][i]['tasks'][j]['command_id']](data['callbacks'][i]['tasks'][j], data['callbacks'][i]['tasks'][j]['responses']);
                }
            }
        }
        comments_by_callback.callbacks = data['callbacks'];
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
        toggle_arrow: function(taskid){
            $('#cardbody' + taskid).on('shown.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(180deg)");
            });
            $('#cardbody' + taskid).on('hidden.bs.collapse', function(){
                $('#color-arrow' + taskid).css("transform", "rotate(0deg)");
            });
        },
        remove_comment: function(id){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, update_operator_comment_callback, "DELETE", null);
        },
        update_view: function(){
            this.$forceUpdate();
        },
        copyStringToClipboard: function (str) {
          // Create new element
          var el = document.createElement('textarea');
          // Set value (string to be copied)
          el.value = str;
          // Set non-editable to avoid focus and move outside of view
          el.setAttribute('readonly', '');
          el.style = {position: 'absolute', left: '-9999px'};
          document.body.appendChild(el);
          // Select text inside element
          el.select();
          // Copy text to clipboard
          document.execCommand('copy');
          // Remove temporary element
          document.body.removeChild(el);
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
        alertTop("success", "Finished", 1);
        for(i = 0; i < data['operators'].length; i++){
            for(j = 0; j < data['operators'][i]['callbacks'].length; j++){
                for(k = 0; k < data['operators'][i]['callbacks'][j]['tasks'].length; k++){
                    data['operators'][i]['callbacks'][j]['tasks'][k]['use_scripted'] = false;
                    if(browser_scripts.hasOwnProperty(data['operators'][i]['callbacks'][j]['tasks'][k]['command_id'])){
                        data['operators'][i]['callbacks'][j]['tasks'][k]['use_scripted'] = true;
                        data['operators'][i]['callbacks'][j]['tasks'][k]['scripted'] = browser_scripts[data['operators'][i]['callbacks'][j]['tasks'][k]['command_id']](data['operators'][i]['callbacks'][j]['tasks'][k], data['operators'][i]['callbacks'][j]['tasks'][k]['responses']);
                    }
                }
            }
        }
        comments_by_operator.operators = data['operators'];
    }
}

httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/by_operator", comments_by_operator_callback, "GET", null);

function view_by_operator(){
    comments_by_callback.callbacks = [];
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/by_operator", comments_by_operator_callback, "GET", null);
    alertTop("info", "Sorting by operator...", 1);
}
function view_by_callback(){
    comments_by_operator.operators = [];
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/by_callback", comments_by_callback_callback, "GET", null);
    alertTop("info", "Sorting by callback...", 1);
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

var search_vue = new Vue({
    el: '#searches',
    delimiters: ['[[', ']]'],
    methods:{
        search: function(){
            search_comments();
        }
    }
})