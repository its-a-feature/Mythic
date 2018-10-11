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
    fd.append("upload_file", file);
    fd.append("json", JSON.stringify(data));
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