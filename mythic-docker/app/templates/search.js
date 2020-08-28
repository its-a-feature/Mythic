document.title = "Search";
/* eslint-disable no-unused-vars */
// this is called from within browser_scripts functions, not directly
var support_scripts = {};
/* eslint-enable no-unused-vars */
var browser_scripts = {}
try {
    eval(atob(" {{support_scripts}} "));
} catch (error) {
    alertTop("danger", "Support Scripting error: " + error.toString());
}
try {
    eval(atob(" {{browser_scripts}} "));
} catch (error) {
    alertTop("danger", "Browser Scripting error: " + error.toString());
}
var searches = new Vue({
    el: '#searches',
    data:{
        option: "output",
        search_field: "",
        operator: "none",
        file_browser_host: "",
        file_browser_comment: "",
        file_browser_path: "",
        file_browser_permissions: {},
        file_browser_history_files: [],
        operators: [],
        responses: [],
        files: [],
        event_messages: [],
        page_size: 30,
        current_page: 1,
        total_count: 0
    },
    methods:{
        search_button: function(){
            this.responses = [];
            this.tasks = [];
            this.files = [];
            this.get_page(1);
        },
        get_page: function(page_num){
            this.responses = [];
            this.files = [];
            this.event_messages = [];
            alertTop("info", "Searching...", 0);
            if(this.option === "output"){
                let data = {"search": this.search_field, "page": page_num, "size": this.page_size, 'type': this.option};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/responses/search", get_search_callback, "POST", data);
            }
            else if(this.option === 'comments'){
                let data = {"search": this.search_field, "page": page_num, "size": this.page_size, 'type': this.option};
                if(this.operator !== "none"){ data['operator'] = this.operator; }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/search", get_search_callback, "POST", data);
            }
            else if(this.option === 'file_browser'){
                let data = {"page": page_num, "size": this.page_size, "host": this.file_browser_host, "comment": this.file_browser_comment,
                "path": this.file_browser_path};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/filebrowserobj/search", (response)=>{
                    try{
                        let rdata = JSON.parse(response);
                        if(rdata['status'] === 'success'){
                            searches.page_size = rdata['size'];
                            searches.total_count = rdata['total_count'];
                            searches.current_page = rdata['page'];
                            searches.files = rdata['output'];
                            //console.log(data);
                            toastr.clear();
                            setTimeout(function(){
                                searches.$forceUpdate();
                                alertTop("success", "Finished", 3);
                              }, 1010 );
                        }
                        else{
                            alertTop("warning", rdata['error']);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", data);
            }
            else if(this.option === "event_log"){
                let data = {"search": this.search_field, "page": page_num, "size": this.page_size};
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/search", (response)=>{
                    try{
                        let rdata = JSON.parse(response);
                        if(rdata['status'] === 'success'){
                            searches.page_size = rdata['size'];
                            searches.total_count = rdata['total_count'];
                            searches.current_page = rdata['page'];
                            searches.event_messages = rdata['output'];
                            //console.log(data);
                            toastr.clear();
                            setTimeout(function(){
                                searches.$forceUpdate();
                                alertTop("success", "Finished", 3);
                              }, 1010 );
                        }
                        else{
                            alertTop("warning", rdata['error']);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", data);
            }
            else{
                let data = {"search": this.search_field, "page": page_num, "size": this.page_size, "type": this.option};
                if(this.operator !== "none"){ data['operator'] = this.operator; }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/search", get_search_callback, "POST", data);
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
        },
        toggle_arrow: function(task){
            $('#cardbody' + task.id).unbind('shown.bs.collapse').on('shown.bs.collapse', function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + task.id, (response)=>{
                     try{
                         let data = JSON.parse(response);
                         task.response = data['responses'];
                         if(task['command_id'] in browser_scripts){
                            task['use_scripted'] = true;
                            task['scripted'] = browser_scripts[task['command_id']](task, Object.values(task['response']));
                        }
                        searches.$forceUpdate();
                     }catch(error){
                         alertTop("danger", "Session expired, please refresh");
                     }
                 }, "GET", null);
                $('#color-arrow' + task.id).removeClass('fa-plus').addClass('fa-minus');
            });
            $('#cardbody' + task.id).unbind('hidden.bs.collapse').on('hidden.bs.collapse', function(){
                $('#color-arrow' + task.id).removeClass('fa-minus').addClass('fa-plus');
            });
        },
        toggle_comment: function(task){
            if(task.comment_visible){
                Vue.set(task, 'comment_visible', false);
            }else{
                Vue.set(task, 'comment_visible', true);
            }
        },
        toggle_show_params: function(task){
            if(task.show_params){
                Vue.set(task, 'show_params', false);
            }else{
                Vue.set(task, 'show_params', true);
            }
        },
        add_comment: function(task){
            $( '#addCommentTextArea' ).val(task.comment);
            $( '#addCommentModal' ).modal('show');
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
                $("#addCommentTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $( '#addCommentSubmit' ).click();
                    }
                });
            });
            $( '#addCommentSubmit' ).unbind('click').click(function(){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, (response)=>{
                    try{
                        let data = JSON.parse(response);
                        if(data['status'] === 'success'){
                            //console.log(data);
                            task = Object.assign(task, data['task']);
                            searches.$forceUpdate();
                        }else{
                            alertTop("warning", data['error']);
                        }
                    }catch(error){
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        remove_comment: function(task){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id,(response)=>{
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        //console.log(data);
                        task['comment'] = "";
                        searches.$forceUpdate();
                    }else{
                        alertTop("warning", data['error']);
                    }
                }catch(error){
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "DELETE", null);
        },
        copyStringToClipboard: function (str) {
              // Create new element
              let el = document.createElement('textarea');
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
              alertTop("info", "Copied...", 1);
        },
        download_raw_output: function(taskid){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid + "/raw_output", (response)=>{
                try{
                    let data = JSON.parse(response);
                    if(data['status'] === 'success'){
                        download_from_memory("task_" + taskid + ".txt", data['output']);
                    }else{
                        alertTop("warning", data['error']);
                    }
                }catch(error){
                    alertTop("danger", "Session expired, please refresh");
                    console.log(error.toString());
                }
            }, "GET", null);
        },
        get_latest_download_path: function(files){
          return "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + files[files.length-1]['agent_file_id'];
        },
        update_file_browser_comment_live: function(data){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/filebrowserobj/" + data.id, (response)=>{
                try{
                    let newdata = JSON.parse(response);
                    if(newdata['status'] === 'error'){
                        alertTop("danger", data['error']);
                    }
                }catch(error){
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "PUT", {"comment": data['comment']});
        },
        view_file_data: function(data){
            try{
                this.file_browser_permissions = JSON.parse(data['permissions']);
            }catch(error){
                this.file_browser_permissions = {"Permissions": data['permissions']};
            }
            $( '#fileBrowserPermissions' ).modal('show');
        },
        view_download_history: function(data){
            // display the history of files associated that the user can choose from and download
            this.file_browser_history_files = data['files'];
            $( '#fileBrowserDownloadHistory' ).modal('show');
        },
        get_file_download_path: function(file){
            return "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + file['agent_file_id'];
        },
        get_task_view_path: function(file){
            return "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + file['task'];
        },
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
            alertTop("warning", data['error']);
        }

    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }

}
function get_search_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            for(let i = 0; i < data['output'].length; i++){
                data['output'][i]['href'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['output'][i]['id'];
                data['output'][i]['use_scripted'] = true;
            }
            //console.log(data);
            searches.responses = data['output'];
            searches.page_size = data['size'];
            searches.total_count = data['total_count'];
            searches.current_page = data['page'];
            searches.$forceUpdate();
            toastr.clear();
            setTimeout(function(){
                searches.$forceUpdate();
                alertTop("success", "Finished", 3);
              }, 1010 );
        }
        else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }
}