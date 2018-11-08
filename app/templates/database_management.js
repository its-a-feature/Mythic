function clear_operators(){
    $( '#clearOperatorModal' ).modal('show');
    $( '#clearOperatorSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/database/clear_operators",
                    clear_callback, "GET", null);
    });
}
function clear_tables(){
    $( '#clearTablesModal' ).modal('show');
    $( '#clearTablesSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/database/clear_entries",
                    clear_callback, "GET", null);
    });
}
function clear_operation_files(){
    $( '#clearOperationalFilesModal' ).modal('show');
    $( '#clearOperationalFilesSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/database/clear_all_files",
                    clear_callback, "GET", null);
    });

}
function clear_callback(response){
	data = JSON.parse(response);
	if(data['status'] == 'success'){
		alertTop("succes", "Successfully cleared");
	}
	else{
		alertTop("danger", "Failed to clear: " + data['error']);
	}
}
