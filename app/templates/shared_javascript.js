function httpGetAsync(theUrl, callback, method, data){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            if (callback){ //post might not have a callback
                callback(xmlHttp.responseText);
            }
    }
    xmlHttp.withCredentials = true;
    xmlHttp.open(method, theUrl, true); // true for asynchronous
    xmlHttp.send(JSON.stringify(data));
}
function uploadFile(url, callback, file){
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Every thing ok, file uploaded
            if (callback){ //post might not have a callback
                callback(xhr.responseText);
            }
        }
    };
    fd.append("upload_file", file);
    xhr.send(fd);
}
function uploadFiles(url, callback, file){
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Every thing ok, file uploaded
            if (callback){ //post might not have a callback
                callback(xhr.responseText);
            }
        }
    };
    fd.append("file_length", file.length);
    fd.append("upload_file", file[0]);
    for(var i = 1; i < file.length; i++){
        fd.append("upload_file_" + i, file[i]);
    }
    xhr.send(fd);
}
function uploadFileAndJSON(url, callback, file, data, method){
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    xhr.open(method, url, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Every thing ok, file uploaded
            if (callback){ //post might not have a callback
                callback(xhr.responseText);
            }
        }
    };
    fd.append("file_length", file.length);
    fd.append("upload_file", file[0]);
    for(var i = 1; i < file.length; i++){
        fd.append("upload_file_" + i, file[i]);
    }
    fd.append("json", JSON.stringify(data));
    xhr.send(fd);

}
function uploadCommandFilesAndJSON(url, callback, file_dict, data){
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Every thing ok, file uploaded
            if (callback){ //post might not have a callback
                callback(xhr.responseText);
            }
        }
    };
    // add in our normal JSON data
    fd.append("json", JSON.stringify(data));
    // now add in all of our files by their param names
    for(var key in file_dict){
        fd.append("file" + key, file_dict[key])
    }
    xhr.send(fd);
}
function base64Encode(data){

}
function base64Decode(data){

}
function httpGetSync(theUrl){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.withCredentials = true;
    xmlHttp.open( "GET", theUrl, false); //false means synchronous
    xmlHttp.send( null );
    return xmlHttp.responseText; // should just use this to get JSON data from RESTful APIs
}
function pythonToJSJson(string){
    updated = string.replace(/\'/g, "\"");
    updated = updated.replace(/True/g, "true");
    updated = updated.replace(/False/g, "false");
    return updated;
}

function alertTop(type, string){
    var html = "<div class=\"alert alert-" + type + " alert-dismissible fade in\" role=\"alert\">" +
    string +
    "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div>";
    if($('#top-alert').html() === undefined){
        $( '#top-alert' ).html($( '#alert-top' ).html() + html);
    }
    else{
        $( '#top-alert' ).html(html);
    }

}
function alertBottom(type, string){
    var html = "<div class=\"alert alert-" + type + " alert-dismissible fade in\" role=\"alert\">" +
    string +
    "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div>";
    $( '#bottom-alert' ).html(html);
}
function clearAlertTop(){
    $( '#top-alert' ).html("");
}
function clearAlertBottom(){
    $( '#bottom-alert' ).html("");
}
function toLocalTime(date){
    var init_date = new Date(date + " UTC");
    return init_date.toDateString() + " " + init_date.toTimeString().substring(0,8);
}
