var callbacks = {}; //all callback data
var tasks = []; //current tasks we're displaying
var all_tasks = {}; //dictionary of arrays of tasks (for each callback's tasks)
var meta = {}; //dictionary of dictionary of metadata
var username = "{{name}}"; //gets the logged in name from the base.html
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks
    },
    methods: {
        interact_button: function(callback){
            //url = "http://localhost/api/v1.0/tasks/callback/" + callback['id'];
            //httpGetAsync(url, display_callback_tasks);
            if ( callback.id in all_tasks ){
                //task_data.tasks = all_tasks[callback.id];
                meta[callback.id].data = all_tasks[callback.id];
            }
            else{
                //Vue.set(task_data, tasks, [])
                //Vue.set(all_tasks, callback.id, []);
                meta[callback.id].data = all_tasks[callback.id];
                //task_data.tasks = [];
            }
            task_data.input_field_placeholder['data'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
            task_data.input_field_placeholder['cid'] = callback.id;
            meta[callback.id]['tasks'] = true;
            meta[callback.id]['display'] = callback.user + "@" + callback.host + "(" + callback.pid + ")";
        },
        hide_tasks: function(callback){
            meta[callback.id]['tasks'] = false;
        },
        exit_callback: function(callback){
            //task the callback to exit on the host
            httpGetAsync("http://{{links.server_ip}}/api/v1.0/tasks/callback/" + callback['id'] + "/operator/" + username,
            null, "POST", {"command":"exit","params":""});
        },
        remove_callback: function(callback){
            //remove callback from our current view until we potentially get a checkin from it
            meta[callback.id]['tasks'] = false;
            //delete meta[callback.id];
            //delete callbacks[callback.id];
            this.$delete(meta, callback.id);
            this.$delete(callbacks, callback.id);
            //update the callback to be active=false
            httpGetAsync("http://{{links.server_ip}}/api/v1.0/callbacks/" + callback['id'],null,"PUT", {"active":"false"});
        }
    },
    delimiters: ['[[',']]']
});
var task_data = new Vue({
    el: '#bottom-data',
    data: {
        tasks,
        input_field: "",
        input_field_placeholder: {"data":"","cid":-1},
        meta: meta,
        all_tasks
    },
    methods:{
        task_button: function(data){
            //submit the input_field data as a task, need to know the current callback id though
            //httpGetAsync(theUrl, callback, method, data)
            task = this.input_field.split(" ");
            command = task[0];
            params = "";
            if (task.length > 1){
                params = task.slice(1, ).join(' '); //join index 1 to the end back into a string of params
            }
            httpGetAsync("http://{{links.server_ip}}/api/v1.0/tasks/callback/" + data['cid'] + "/operator/" + username,
            null, "POST", {"command":command,"params":params});
            //alert("submitting " + this.input_field);
            this.input_field = "";
        },
        select_tab: function(tab_data, tab_id){
            task_data.input_field_placeholder['data'] = tab_data;
            task_data.input_field_placeholder['cid'] = tab_id;
        }
    },
    delimiters: ['[[', ']]']
});
function startwebsocket_callbacks(){
    var ws = new WebSocket('ws://{{links.server_ip}}/ws/callbacks');
    ws.onmessage = function(event){
        if (event.data != ""){

            cb = JSON.parse(event.data);
            console.log(cb);
            if(cb['active'] == false){
                return; //don't process this if the callback is no longer active
            }
            if (cb.hasOwnProperty('operator')){
                if (cb['operator'] == "null"){
                    delete cb.operator;
                }
                else{
                    op = cb['operator']['username'].slice(0);
                    delete cb.operator;
                    cb['operator'] = op;
                }
            }
            cb['real_time'] = "0:0:0:0";
            //callbacks.push(cb);
            Vue.set(callbacks, cb['id'], cb);
            Vue.set(task_data.meta, cb['id'], {'id': cb['id'],
                                               'tasks': false,
                                               'data':task_data.tasks,
                                               'display': ''});
        }
    };
    ws.onclose = function(){
        console.log("socket closed");
    }
    ws.onerror = function(){
        console.log("websocket error");
    }
    ws.onopen = function(event){
        console.debug("opened");
    }
};
function startwebsocket_newtasks(){
    var ws = new WebSocket('ws://{{links.server_ip}}/ws/tasks');
    ws.onmessage = function(event){
        if (event.data != ""){
            tsk = JSON.parse(event.data);
            //console.log("new task");
            //console.log(tsk);
            if (tsk['callback']['active'] == false){
                return;
            }
            if ( !(tsk['callback']['id'] in all_tasks) ){
                // if there is NOT this specific callback.id in the tasks dictionary
                // then create it as an empty dictionary
                Vue.set(all_tasks, tsk['callback']['id'], {}); //create an empty dictionary
            }
            Vue.set(all_tasks[tsk['callback']['id']], tsk['id'], tsk);
            // in case this is the first task and we're waiting for it to show up, reset this
            meta[tsk['callback']['id']].data = all_tasks[tsk['callback']['id']];
        }
    };
};
function startwebsocket_updatedtasks(){
    var ws = new WebSocket('ws://{{links.server_ip}}/ws/responses');
    ws.onmessage = function(event){
        if (event.data != ""){
            rsp = JSON.parse(event.data);
            if(rsp['task']['callback']['id'] in all_tasks){
                //if we have that callback id in our all_tasks list
                if(!all_tasks[rsp['task']['callback']['id']][rsp['task']['id']]['response']){
                    //but we haven't received any responses for the specified task_id
                    Vue.set(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']], 'response', {});
                }
                console.log(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']]);
                Vue.set(all_tasks[ rsp['task']['callback']['id']] [rsp['task']['id']] ['response'], rsp['id'], {'timestamp': rsp['timestamp'], 'response': rsp['response']});
            }
        }
    };
};
function startwebsocket_updatedcallbacks(){
var ws = new WebSocket('ws://{{links.server_ip}}/ws/updatedcallbacks');
    ws.onmessage = function(event){
        if (event.data != ""){
            rsp = JSON.parse(event.data);
            if(callbacks[rsp['id']]){
                callbacks[rsp['id']]['last_checkin'] = rsp['last_checkin'];
            }
        }
    }
};
function updateClocks(){
    now = new Date();
    for(var key in callbacks){
        // update each 'last_checkin' time to be now - that value
        checkin_time = new Date(callbacks[key]['last_checkin']);
        callbacks[key]['real_time'] = timeConversion(now - checkin_time);
    }
}
function timeConversion(millisec){
    var seconds = Math.trunc(((millisec / 1000).toFixed(1)) % 60);
    var minutes = Math.trunc(((millisec / (1000 * 60)).toFixed(1)) % 60);
    var hours = Math.trunc(((millisec / (1000 * 60 * 60)).toFixed(1)) % 24);
    var days = Math.trunc(((millisec / (1000 * 60 * 60 * 24)).toFixed(1)) % 365);
    return days + ":" + hours + ":" + minutes + ":" + seconds;
}
function httpGetAsync(theUrl, callback, method, data){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            if (callback){ //post might not have a callback
                callback(xmlHttp.responseText);
            }
    }
    xmlHttp.open(method, theUrl, true); // true for asynchronous
    xmlHttp.send(JSON.stringify(data));
}
function display_callback_tasks(data){
    // update the callback's task data
    tsk = JSON.parse(data);
    console.log(tsk);
}

startwebsocket_callbacks();
setInterval(updateClocks, 1000);
startwebsocket_newtasks();
startwebsocket_updatedtasks();
startwebsocket_updatedcallbacks();
