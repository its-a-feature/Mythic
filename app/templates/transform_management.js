var transform_code = new Vue({
    el: '#transform_code',
    data:{
        code: ""
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/view", initialize_code, "GET", null);
function initialize_code(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        transform_code.code = atob(data['code']);
    }else{
        alertTop("danger", data['error']);
    }
}

function download_code_button(){
    window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/download", "_blank").focus();
}
function upload_code_button(){
    $( '#FileModal').modal('show');
    $( '#FileSubmit').unbind('click').click(function(){
        //uploadFileAndJSON(url, callback, file, data, method)
        var file = document.getElementById('FileUpload');
        var filedata = file.files;
        uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/upload/",
        file_upload_callback, filedata, data, "POST");
        file.value = file.defaultValue;
    });
}
function file_upload_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        alertTop("success", "Successfully uploaded");
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/view", initialize_code, "GET", null);
    }else{
        alertTop("danger", data['error']);
    }
}
function update_code_button(){
    var code = btoa(transform_code.code);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/upload", update_code_callback, "POST", {"code": code});
}
function update_code_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }else{
        alertTop("success", "Success");
    }
}