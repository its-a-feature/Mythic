function(task, response){
  var rows = [];
  for(let i = 0; i < response.length; i++){
    try{
        var data = JSON.parse(response[i]['response']);
    }catch(error){
        return escapeHTML(response);
    }
    data.forEach(function(r){
      let row_style = "";
      rows.push({"process_id": escapeHTML(r['process_id']),
                          "parent_process_id": escapeHTML(r['parent_process_id']),
                          "path": escapeHTML(r['bin_path']),
                          "user": escapeHTML(r['user']),
                          "row-style": row_style,
                           "cell-style": {}
                         });
    });
  }
  return support_scripts['atlas_create_table']([{"name":"process_id", "size":"10em"},{"name":"parent_process_id", "size":"10em"}, {"name": "user", "size": "10em"},{"name":"path", "size":""}], rows);
}
