function clear_operators(){
    $( '#clearOperatorModal' ).modal('show');
    $( '#clearOperatorSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/database/clear_operators",
                    null, "GET", null);
    });
}
function clear_tables(){
    $( '#clearTablesModal' ).modal('show');
    $( '#clearTablesSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/database/clear_entries",
                    null, "GET", null);
    });
}
function clear_operation_files(){
    $( '#clearOperationalFilesModal' ).modal('show');
    $( '#clearOperationalFilesSubmit' ).unbind('click').click(function(){
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}/api/v1.0/database/clear_all_files",
                    null, "GET", null);
    });

}