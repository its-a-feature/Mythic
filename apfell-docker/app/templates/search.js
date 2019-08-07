var searches = new Vue({
    el: '#searches',
    data:{
        option: "output",
        search_field: "",
        tasks: [],
        responses: [],
        page_size: 30,
        current_page: 1,
        total_count: 0

    },
    methods:{
        search_button: function(){
            if(this.search_field == ""){
                alertTop("warning", "Need to actually type something to search for...", 1);
                return;
            }
            if(this.option == "output"){
                this.responses = [];
                this.tasks = [];
                this.get_page(1);
            }
            else{
                this.responses = [];
                this.tasks = [];
                this.get_page(1);
            }
        },
        get_page: function(page_num){
            if(this.option == "output"){
                this.responses = [];
                this.tasks = [];
                alertTop("info", "Searching...", 1);
                data = {"search": this.search_field, "page": page_num, "size": this.page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/search", get_search_callback, "POST", data);
            }
            else{
                this.responses = [];
                this.tasks = [];
                alertTop("info", "Searching...", 1);
                data = {"search": this.search_field, "page": page_num, "size": this.page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/search", get_search_tasks_callback, "POST", data);
            }
        },
        get_new_page_size: function(){
            this.page_size = $('#page_size').val();
            this.get_page(1);
        }
    },
    delimiters: ['[[', ']]']
})

function get_search_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        for(var i = 0; i < data['output'].length; i++){
            data['output'][i]['share_task'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['output'][i]['task']['id'];
        }
        searches.responses = data['output'];
        searches.page_size = data['size'];
        searches.total_count = data['total_count'];
        searches.current_page = data['page'];
        alertTop("success", "Finished", 1);
    }
    else{
        alertTop("danger", data['error']);
    }
}

function get_search_tasks_callback(response){
    try{
        var data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        for(var i = 0; i < data['output'].length; i++){
            data['output'][i]['share_task'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['output'][i]['id'];
        }
        searches.tasks = data['output'];
        searches.page_size = data['size'];
        searches.total_count = data['total_count'];
        searches.current_page = data['page'];
        alertTop("success", "Finished", 1);
    }
    else{
        alertTop("danger", data['error']);
    }
}