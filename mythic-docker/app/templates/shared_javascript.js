// This page has all of the shared javascript functions used across a variety of pages
/* eslint-disable no-redeclare,no-unused-vars */
function httpGetAsync(theUrl, callback, method, data) {
    try {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (callback) { //post might not have a callback
                    callback(xhr.responseText);
                }
            } else if (xhr.status === 302) {
                // either got redirected or try to post/put to a bad path
                console.log("httpGetAsync was redirected from url " + theUrl + " with method " + method);
            } else if (xhr.readyState === 4) {
                console.log("httpGetAsync Error to " + theUrl + " with data: " + data + " and  method: " + method);
                if (callback) {
                    console.log(xhr);
                    if (xhr.status === 0) {
                        callback(JSON.stringify({
                            'status': 'error',
                            'error': 'Mythic encountered an error due to a Cert or Network issue. ' +
                                'This is likely due to a Chrome cert issue where you need to re-accept the self-signed certificate. Please refresh.'
                        }));
                    } else {
                        callback(JSON.stringify({
                            'status': 'error',
                            'error': 'Mythic encountered an error: ' + xhr.status + ": " + xhr.statusText
                        }));
                    }
                } else {
                    alertTop("danger", "HTTP Browser error: " + xhr.statusText);
                }
            }
        };
        //xmlHttp.withCredentials = true;
        xhr.open(method, theUrl, true); // true for asynchronous
        xhr.setRequestHeader("content-type", "application/json");
        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("access_token"));
        //xmlHttp.setRequestHeader("refresh_token", localStorage.getItem("refresh_token"));
        xhr.send(JSON.stringify(data));
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }
}

function uploadFile(url, callback, file) {
    try {
        let xhr = new XMLHttpRequest();
        let fd = new FormData();
        xhr.open("POST", url, true);
        //xhr.withCredentials = true;
        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("access_token"));
        //xhr.setRequestHeader("refresh_token", localStorage.getItem("refresh_token"));
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (callback) { //post might not have a callback
                    callback(xhr.responseText);
                }
            } else if (xhr.readyState === 4 && (xhr.status === 302 || xhr.status === 405)) {
                // either got redirected or try to post/put to a bad path
                console.log("httpGetAsync was 302 or 405 from url " + url);
            } else if (xhr.readyState === 4) {
                console.log("httpGetAsync Error to " + url + " with data: " + fd);
                if (callback) {
                    callback(JSON.stringify({
                        'status': 'error',
                        'error': 'Mythic encountered an error: ' + xhr.status + ": " + xhr.statusText
                    }));
                }
            }
        };
        fd.append("upload_file", file);
        xhr.send(fd);
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }

}

function uploadFiles(url, callback, file) {
    try {
        let xhr = new XMLHttpRequest();
        let fd = new FormData();
        xhr.open("POST", url, true);
        //xhr.withCredentials = true;
        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("access_token"));
        //xhr.setRequestHeader("refresh_token", localStorage.getItem("refresh_token"));
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (callback) { //post might not have a callback
                    callback(xhr.responseText);
                }
            } else if (xhr.readyState === 4 && (xhr.status === 302 || xhr.status === 405)) {
                // either got redirected or try to post/put to a bad path
                console.log("httpGetAsync was 302 or 405 from url " + url);
            } else if (xhr.readyState === 4) {
                console.log("httpGetAsync Error to " + url + " with data: " + fd);
                if (callback) {
                    callback(JSON.stringify({
                        'status': 'error',
                        'error': 'Mythic encountered an error: ' + xhr.status + ": " + xhr.statusText
                    }));
                }
            }
        };
        fd.append("file_length", file.length);
        fd.append("upload_file", file[0]);
        for (let i = 1; i < file.length; i++) {
            fd.append("upload_file_" + i, file[i]);
        }
        xhr.send(fd);
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }

}

function uploadFileAndJSON(url, callback, file, data, method) {
    try {
        let xhr = new XMLHttpRequest();
        let fd = new FormData();
        xhr.open(method, url, true);
        //xhr.withCredentials = true;
        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("access_token"));
        //xhr.setRequestHeader("refresh_token", localStorage.getItem("refresh_token"));
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (callback) { //post might not have a callback
                    callback(xhr.responseText);
                }
            } else if (xhr.readyState === 4 && (xhr.status === 302 || xhr.status === 405)) {
                // either got redirected or try to post/put to a bad path
                console.log("httpGetAsync was 302 or 405 from url " + url);
            } else if (xhr.readyState === 4) {
                console.log("httpGetAsync Error to " + url + " with data: " + fd);
                if (callback) {
                    callback(JSON.stringify({
                        'status': 'error',
                        'error': 'Mythic encountered an error: ' + xhr.status + ": " + xhr.statusText
                    }));
                }
            }
        };
        fd.append("file_length", file.length);
        fd.append("upload_file", file[0]);
        for (let i = 1; i < file.length; i++) {
            fd.append("upload_file_" + i, file[i]);
        }
        fd.append("json", JSON.stringify(data));
        xhr.send(fd);
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }
}

function uploadCommandFilesAndJSON(url, callback, file_dict, data) {
    try {
        let xhr = new XMLHttpRequest();
        let fd = new FormData();
        xhr.open("POST", url, true);
        //xhr.withCredentials = true;
        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("access_token"));
        //xhr.setRequestHeader("refresh_token", localStorage.getItem("refresh_token"));
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (callback) { //post might not have a callback
                    callback(xhr.responseText);
                }
            } else if (xhr.readyState === 4 && (xhr.status === 302 || xhr.status === 405)) {
                // either got redirected or try to post/put to a bad path
                console.log("httpGetAsync was 302 or 405 from url " + url);
            } else if (xhr.readyState === 4) {
                console.log("httpGetAsync Error to " + url + " with data: " + fd);
                if (callback) {
                    callback(JSON.stringify({
                        'status': 'error',
                        'error': 'Mythic encountered an error: ' + xhr.status + ": " + xhr.statusText
                    }));
                }
            }
        };
        // add in our normal JSON data
        fd.append("json", JSON.stringify(data));
        // now add in all of our files by their param names
        for (let key in file_dict) {
            fd.append("file" + key, file_dict[key]);
        }
        xhr.send(fd);
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }
}

function download_from_memory(filename, text) {
    try {
        let element = window.document.createElement('a');
        element.href = window.URL.createObjectURL(new Blob([atob(text)], {type: 'text'}));
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        setTimeout(() => {
            document.body.removeChild(element);
        }, 4000);
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }
}

function httpGetSync(theUrl) {
    try {
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.withCredentials = true;
        xmlHttp.open("GET", theUrl, false); //false means synchronous
        xmlHttp.setRequestHeader("content-type", "application/json");
        xmlHttp.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("access_token"));
        //xmlHttp.setRequestHeader("refresh_token", localStorage.getItem("refresh_token"));
        xmlHttp.send(null);
        return xmlHttp.responseText; // should just use this to get JSON data from RESTful APIs
    } catch (error) {
        alertTop("danger", "HTTP Browser error: " + error.toString());
    }

}

function wsonclose(event) {
    //alertTop("danger", "Websocket closed.<br> Please refresh to re-establish connections or select an active operation");
    console.log("Error: websocket closed");
    if (!event.wasClean) {
        alertTop("danger", "Please refresh to re-establish connections or select an active operation", 0, "Websocket closed.");
    }
}

function wsonerror(event) {
    console.log(event);
}

function alertTop(type, string, delay = 4, title = "", escape_HTML = true) {
    delay = delay * 1000;
    if (type === "danger" && delay === 4000) {
        delay = 0;
    }
    toastr.options.timeOut = delay.toString();
    toastr.options.extendedTimeOut = delay.toString();
    toastr.options.escapeHtml = escape_HTML;
    let msg;
    if (type === "success") {
        msg = toastr.success(string, title);
    } else if (type === "danger") {
        msg = toastr.error(string, title);
    } else if (type === "info") {
        msg = toastr.info(string, title);
    } else {
        msg = toastr.warning(string, title);
    }
    if (msg !== undefined) {
        msg.css({"width": "100%", "min-width": "400px", "white-space": "pre-wrap"});
    }
}

function clearTop() {
    toastr.clear();
}

toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "preventDuplicates": true,
    "onclick": null,
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut",
    "tapToDismiss": false,
    "toastClass": 'toastr'
};

function toLocalTime(date) {
    try {
        let init_date = new Date(date + " UTC");
        /* eslint-disable no-constant-condition */
        // this isn't a constant, eslint just isn't jinja aware
        if ("{{view_utc_time}}" === "True") {
            return date + " UTC";
        }
        /* eslint-enable no-constant-condition */
        return init_date.toDateString() + " " + init_date.toTimeString().substring(0, 8);
    } catch (error) {
        alertTop("warning", "Failed to get local time converted: " + error.toString());
    }

}

function sort_table(th) {
    //sort the table
    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
    const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
            v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2.toString())
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
    let table = th.parentElement.parentElement;
    Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tr => table.appendChild(tr));
    // deal with carets and the right directions
    let imgs_to_remove = th.parentElement.querySelectorAll("i");
    for (let i = 0; i < imgs_to_remove.length; i++) {
        imgs_to_remove[i].remove();
    }
    let el = document.createElement('i');
    if (this.asc) {
        el.setAttribute('class', 'fas fa-sort-up');
    } else {
        el.setAttribute('class', 'fas fa-sort-down');
    }
    th.appendChild(el);
}

function adjust_size(ta) {
    let scroll_box = $('#' + ta.id);
    scroll_box.css('height', '2rem');
    let height = scroll_box.get(0).scrollHeight + 20;
    if (height > 800) {
        height = 800;
    }
    scroll_box.css('height', height + "px");
}

function copyStringToClipboard(str) {
    try {
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
    } catch (error) {
        alertTop("warning", "Failed to copy to clipboard: " + error.toString());
    }
}

function pythonToJSJson(string) {
    let updated = string.replace(/'/g, "\"");
    updated = updated.replace(/True/g, "true");
    updated = updated.replace(/False/g, "false");
    return updated;
}
var event_notices = new Vue({
    el: '#event_notices',
    data: {
        messages: []
    },
    methods: {
        remove_message: function (data) {
            for (let i = 0; i < this.messages.length; i++) {
                if (this.messages[i]['id'] === data['id']) {
                    this.messages.splice(i, 1);
                    return;
                }
            }
        },
        add_message: function (data) {
            for (let i = 0; i < this.messages.length; i++) {
                if (this.messages[i]['id'] === data['id']) {
                    return;
                }
            }
            this.messages.push({'id': data['id']});
        }
    },
    delimiters: ['[[', ']]']
});

function startwebsocket_events() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/events_notifier/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            if (data['channel'] === 'historic') {
                event_notices.messages = data['alerts'];
            } else if (data['channel'].includes("new")) {
                if (data['operator'] !== "{{name|e}}") {
                    alertTop(data['level'], data['message'], 4, data['operator']);
                }
                if (data['level'] !== 'info') {
                    event_notices.add_message(data);
                }
            } else {
                if (data['deleted']) {
                    event_notices.remove_message(data);
                } else if (data['resolved']) {
                    event_notices.remove_message(data);
                } else if (!data['resolved'] && data['level'] !== "info") {
                    event_notices.add_message(data);
                }
            }
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

// Set our access token and referesh token in the session storage when we first log in
// this will be manually added to all GET/POST requests made to API calls
/* eslint-disable no-constant-condition */
// this isn't a constant, eslint just isn't jinja aware
if ("{{access_token}}" !== "") {
    localStorage.setItem("access_token", "{{access_token}}");
}
if ("{{refresh_token}}" !== "") {
    localStorage.setItem("refresh_token", "{{refresh_token}}");
    window.location = "/";
}

if ("{{name}}" !== "") {
    startwebsocket_events();
}
/* eslint-enable no-constant-condition */
let successful_refresh = true;

function refresh_access_token() {
    try {
        let refresh_token = localStorage.getItem("refresh_token");
        if (refresh_token !== null && successful_refresh && refresh_token !== undefined) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/refresh", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['access_token'] !== undefined) {
                        localStorage.setItem("access_token", data['access_token']);
                    } else {
                        successful_refresh = false;
                    }
                } catch (error) {
                    successful_refresh = false;
                    console.log("failed to update access token: " + error.toString());
                    //alertTop("warning", "Failed to refresh access token");
                }
            }, "POST", {"refresh_token": refresh_token});
        }
    } catch (error) {
        alertTop("warning", "Failed to refresh access token: " + error.toString());
    }
}

setInterval(refresh_access_token, 600000); // update every 10min
$(document).keydown(function (e) {
    let code = e.keyCode || e.which;
    if (code === 27) {
        $(".modal").modal('hide');
    }
});

function escapeHTML(content) {
    if (typeof content === "string") {
        return content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    } else {
        return content;
    }

}


