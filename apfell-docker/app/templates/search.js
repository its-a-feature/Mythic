var searches = new Vue({
    el: '#searches',
    data:{
        option: "output",
        search_field: "",
        operator: "none",
        operators: [],
        tasks: [],
        responses: [],
        page_size: 30,
        current_page: 1,
        total_count: 0
    },
    methods:{
        search_button: function(){
            this.responses = [];
            this.tasks = [];
            this.get_page(1);
        },
        get_page: function(page_num){
            if(this.option === "output"){
                this.responses = [];
                this.tasks = [];
                alertTop("info", "Searching...", 1);
                let data = {"search": this.search_field, "page": page_num, "size": this.page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/search", get_search_callback, "POST", data);
            }
            else{
                this.responses = [];
                this.tasks = [];
                alertTop("info", "Searching...", 1);
                let data = {"search": this.search_field, "page": page_num, "size": this.page_size, "type": this.option};
                if(this.operator !== "none"){ data['operator'] = this.operator; }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/search", get_search_tasks_callback, "POST", data);
            }
        },
        get_new_page_size: function(){
            this.page_size = $('#page_size').val();
            this.get_page(1);
        },
        export_page: function(){
            if(this.tasks.length > 0){
                let data = {"search": this.search_field, "search_type": this.option, "results": this.tasks, "total_results": this.total_count, "page": this.current_page, "limit_operators": this.operator};
                data = JSON.stringify(data, null, 2);
                //console.log(data);
                download_from_memory("search_results.json", btoa(data));
            }else if(this.responses.length > 0){
                let data = {"search": this.search_field, "search_type": this.option, "results": this.responses, "total_results": this.total_count, "page": this.current_page};
                data = JSON.stringify(data, null, 2);
                //console.log(data);
                download_from_memory("search_results.json", btoa(data));
            }else{
                alertTop("warning", "Nothing to export...");
            }
        },
        export_search: function(){
            alertTop("info", "Exporting...");
            if(this.option === "output"){
                let data = {"search": this.search_field};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/search", export_search_callback, "POST", data);
            }
            else{
                // not specify a page will get all of the data
                let data = {"search": this.search_field, "type": this.option};
                if(this.operator !== "none"){ data['operator'] = this.operator; }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/search", export_search_callback, "POST", data);
            }
        }
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/operators", (response) => {
    try{
        let data = JSON.parse(response);
        searches.operators = data;
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }

}, "GET", null);
function export_search_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            let output = {"search": searches.search_field, "search_type": searches.option, "total_results": data['total_count'] , "results": data['output']};
            output = JSON.stringify(output);
            download_from_memory("search_results.json", btoa(output));
        }else{
            alertTop("danger", data['error']);
        }

    }catch(error){
        alertTop("danger", "Session expired, please referesh");
    }

}
function get_search_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            for(let i = 0; i < data['output'].length; i++){
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
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}

function get_search_tasks_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            for(let i = 0; i < data['output'].length; i++){
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
    }catch(error) {
        alertTop("danger", "Session expired, please refresh");
    }
}