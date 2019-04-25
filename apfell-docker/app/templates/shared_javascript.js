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
function download_from_memory(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:octet/stream;charset=utf-8;base64,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
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

function alertTop(type, string, delay=4){
    //document.getElementById("top-alert").style = "";
    //var html = "<div class=\"alert alert-" + type + " alert-dismissible fade in\" role=\"alert\" style=\"white-space: pre-wrap\">" +
    //string +
    //"<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div>";
    //if($('#top-alert').html() === undefined){
    //    $( '#top-alert' ).html($( '#alert-top' ).html() + html);
    //}
    //else{
    //    $( '#top-alert' ).html(html);
    //}
    delay = delay * 1000;
    if( type == "danger" && delay == 4000){
        delay = 0;
    }
    $.notify({
	// options
	message: string
    },{
	// settings
	element: 'body',
	position: null,
	type: type,
	allow_dismiss: true,
	newest_on_top: false,
	showProgressbar: false,
	placement: {
		from: "top",
		align: "right"
	},
	offset: 20,
	spacing: 10,
	z_index: 1031,
	delay: delay,
	timer: 1000,
	animate: {
		enter: 'animated fadeInDown',
		exit: 'animated fadeOutUp'
	},
	onShow: null,
	onShown: null,
	onClose: null,
	onClosed: null,
	icon_type: 'class',
	template: '<div data-notify="container" class="alert alert-{0}" role="alert">' +
		'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
		'<span data-notify="icon"></span> ' +
		'<span data-notify="title">{1}</span> ' +
		'<span data-notify="message">{2}</span>' +
		'<div class="progress" data-notify="progressbar">' +
			'<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
		'</div>' +
		'<a href="{3}" target="{4}" data-notify="url"></a>' +
	'</div>'
});


}
function alertBottom(type, string){
    document.getElementById("bottom-alert").style = "";
    var html = "<div class=\"alert alert-" + type + " alert-dismissible fade in\" role=\"alert\" style=\"white-space: pre-wrap\">" +
    string +
    "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div>";
    $( '#bottom-alert' ).append(html);
}
function clearAlertTop(){
    $("#top-alert").fadeTo(20, 50).slideUp(500, function(){
          $("#middle-alert").slideUp(500);
    });
    $.notifyClose();
}
function clearAlertBottom(){
    $( '#bottom-alert' ).html("");
}
function toLocalTime(date){
    var init_date = new Date(date + " UTC");
    return init_date.toDateString() + " " + init_date.toTimeString().substring(0,8);
}
