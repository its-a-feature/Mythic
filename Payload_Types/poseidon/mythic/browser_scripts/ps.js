function(task, response){
  let rows = [];
  let uniqueName = task.id + "_additional_process_info_modal";
  for(let i = 0; i < response.length; i++){
    try{
        var data = JSON.parse(response[i]['response']);
    }catch(error){
        return escapeHTML(response);
    }
    data.forEach(function(r){
      let row_style = "";
      if(r['name'].includes("Little Snitch")){
          row_style = "background-color:indianred;color:black;";
      }else if(r['bundleid'].includes("objective-see")){
          row_style = "background-color:indianred;color:black;";
      }
      let additionalInfo = "<pre>" + escapeHTML(JSON.stringify(r, null, 2)) + '</pre>';
      rows.push({"pid": escapeHTML(r['process_id']),
                          "ppid": escapeHTML(r['parent_process_id']),
                          "path": escapeHTML(r['bin_path']),
                          "user": escapeHTML(r['user']),
                          "name": escapeHTML(r['name']),
                          "metadata": '<i class="fas fa-info-circle" modal-name="' + escapeHTML(uniqueName) + '" additional-info="' + escapeHTML(additionalInfo) + '" onclick=support_scripts[\"poseidon_show_process_additional_info_modal\"](this) style="cursor:pointer"></i> ',
                          "row-style": row_style,
                           "cell-style": {}
                         });
    });
  }
  let output = support_scripts['poseidon_create_process_additional_info_modal'](escapeHTML(uniqueName));
  output += support_scripts['poseidon_create_table'](
      [
      {"name":"pid", "size":"3em"},
      {"name":"pid", "size":"3em"},
      {"name": "name", "size": "10rem"},
      {"name": "user", "size": "10em"},
      {"name": "metadata", "size": "5rem"},
      {"name":"path", "size":""}
      ], rows);
  return output;
}
