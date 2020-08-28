document.title = "Task Feed";
var live_feed = new Vue({
    el: '#feed',
    delimiters: ['[[', ']]'],
    data: {
        tasks: [],
        filter: ""
    },
    methods: {
        apply_filter: function (task) {
            if (this.filter.includes(":")) {
                let pieces = this.filter.split(":");
                if (pieces[0] in task) {
                    return task[pieces[0]].toString().includes(pieces[1]);
                } else {
                    return false;
                }
            } else {
                return true;
            }
        }
    }
});

function startwebsocket_tasks() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/task_feed/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            data['href'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['id'];
            for (let i = live_feed.tasks.length - 1; i >= 0; i--) {
                if (data['id'] === live_feed.tasks[i]['id']) {
                    Vue.set(live_feed.tasks, i, data);
                    return;
                }
            }
            //adding a new task, sort it so that the newest is on top
            live_feed.tasks.unshift(data);
            //live_feed.tasks.push(data);
            live_feed.tasks.sort((a, b) => (b.id > a.id) ? 1 : ((a.id > b.id) ? -1 : 0));
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_tasks();