var task_info = new Vue({
    el: '#task_info',
    data: {
        callback: {},
        task: {},
        responses: []
    },
    delimiters: ['[[',']]']
});
function set_info(response){
    var data = JSON.parse(response);
    if(data['status'] == "error"){
        alertTop("danger", data['error']);
        return;
    }
    else{
        console.log(data);
        task_info.callback = data['callback'];
        task_info.task = data['task'];
        task_info.responses = data['responses'];
    }
}
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/{{tid}}", set_info, "GET", null);
