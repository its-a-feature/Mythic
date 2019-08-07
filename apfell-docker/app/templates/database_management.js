function clear_payloads(){
    show_modal_and_clear("payloads", "This will remove all registered payloads from the database, and as such will cascade to all of the other listed database entries as well");
}
function clear_callbacks(){
    show_modal_and_clear("callbacks", "This will remove all the Callbacks, and as such will cascade to all of the other listed database entries as well.");
}
function clear_screencaptures(){
    show_modal_and_clear("screencaptures", "This will remove all of the screenshots from the database and disk");
}
function clear_downloads(){
    show_modal_and_clear("downloads", "This will remove all of the downloaded files from disk and the database");
}
function clear_uploads(){
    show_modal_and_clear("uploads", "This will remove all of the uploaded files from disk and the database");
}
function clear_keylogs(){
    show_modal_and_clear("keylogs", "This will remove all of the keylog entries from the database");
}
function clear_credentials(){
    show_modal_and_clear("credentials", "This will remove all of the credentials from the database");
}
function clear_tasks(){
    show_modal_and_clear("tasks", "This will remove all of the tasks and responses from the database");
}
function clear_responses(){
    show_modal_and_clear("responses", "This will remove all of the responses from the database");
}
function clear_artifacts(){
    show_modal_and_clear("artfacts", "This will remove all of the artifacts from the database");
}
var clearVue = new Vue({
    el: '#clearModal',
    data: {
        description: ""
    },
    delimiters: ['[[',']]']
});
function show_modal_and_clear(extension, explanation){
    clearVue.description = explanation;
    $( '#clearModal' ).modal('show');
    $( '#clearSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/database/clear",
                    clear_callback, "POST", {"object": extension});
    });
}
function clear_callback(response){
    try{
	    data = JSON.parse(response);
	   }catch(error){
	    alertTop("danger", "Session expired, please refresh or login again");
	   }
	if(data['status'] == 'success'){
		alertTop("success", "Successfully cleared " + data['stats']['dbnumber'] + " database objects");
	}
	else{
		alertTop("danger", "Failed to clear: " + data['error']);
	}
}
