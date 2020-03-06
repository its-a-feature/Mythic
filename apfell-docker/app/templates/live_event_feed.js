document.title = "Event Feed";
var live_feed = new Vue({
   el: '#feed',
   delimiters: ['[[', ']]'],
   data: {
        events: [],
        filter: "",
        input_field: ""
   },
    methods:{
       apply_filter: function(e){
           if(this.filter.includes(":")){
                let pieces = this.filter.split(":");
                if(e.hasOwnProperty(pieces[0])){
                    return e[pieces[0]].toString().includes(pieces[1]);
                }else{
                    return false;
                }
           }else{
               return true;
           }
       },
        send_message: function(){
            let data = {'message': this.input_field};
            this.input_field = "";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/event_message/" ,(response)=>{
                try{
                    let r = JSON.parse(response);
                    if(r['status'] === 'error'){
                        alertTop("warning", r['error']);
                    }
                }catch(error){
                    console.log(error.toString());
                    alertTop("danger", "Session expired, please refresh");
                }
            },"POST",data);

        }
    }
});

function startwebsocket_events() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/events/current_operation');
    ws.onmessage = function (event) {
        if (event.data !== "") {
            let data = JSON.parse(event.data);
            live_feed.events.unshift(data);
            //live_feed.events.push(data);
            live_feed.events.sort((a,b) =>(b.id > a.id) ? 1 : ((a.id > b.id) ? -1 : 0));
        }
    };
    ws.onclose = function () {
        wsonclose();
    };
    ws.onerror = function () {
        wsonerror();
    };
}startwebsocket_events();