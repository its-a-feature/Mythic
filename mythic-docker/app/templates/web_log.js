document.title = "Web log";
var searches = new Vue({
    el: '#searches',
    data:{
        entries: [],
        page_size: 1000,
        current_page: 1,
        total_count: 0
    },
    methods:{
        get_page: function(page_num){
            this.entries = [];
            let data = {"page": page_num, "entries": this.page_size};
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mythic_logs/", get_search_callback, "POST", data);
        },
        get_new_page_size: function(){
            this.page_size = $('#page_size').val();
            this.get_page(1);
        }
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mythic_logs", (response) => {
    try{
        let data = JSON.parse(response);
        for(let i = data['output'].length -1; i >= 0; i--){
                let log = JSON.parse(data['output'][i]);
                if(log['level'] === 'ERROR' || log['level'] === 'CRITICAL' || log['status'] === 500) {
                    log['color'] = "indianred";
                }else{
                    log['color'] = "";
                }
                searches.entries.push(log);
            }
        searches.total_count = data['total'];
    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }

}, "GET", null);
function get_search_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            for(let i = data['output'].length -1; i >= 0; i--){
                let log = JSON.parse(data['output'][i]);
                if(log['level'] === 'ERROR' || log['level'] === 'CRITICAL' || log['status'] === 500) {
                    log['color'] = "red";
                }else{
                    log['color'] = "";
                }
                searches.entries.push(log);
            }
            //searches.entries = JSON.parse(data['output']);
            searches.total_count = data['total'];
            searches.current_page = data['page'];
        }
        else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}