function(task, response){
	const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
};
    var total_output = "";
    var total_results = "";
  for(var i = 0; i < response.length; i++){
    try{
    		total_results += response[i]["response"];
    }catch(error){
        return response;
    }
  }
  var data = JSON.parse(total_results);
   var keys = ["azure_files", "aws_files", "ssh_files", "kerberos_tickets", "history_files", "log_files", "shellscript_files", "yaml_files", "conf_files", "csv_files", "db_files", "mysql_confs", "interesting_files"];
   for (i = 0; i < keys.length; i++) {
       if (data[keys[i]] != null) {
           var output = "";
           var rows = []
            var cell_style = {"hidden": "text-align:center",
                              "type":"text-align:center"};
           var title_parts = keys[i].split("_");
           title_parts[0] = capitalize(title_parts[0]);
           title_parts[1] = capitalize(title_parts[1]);
           title = title_parts.join(" ");
           if (i < 4) {
                output += '<div class="card-header shadow" style="top: 0px; background-color: #DC143C; color: white;">' + title + '</div>';
           } else {
                output += '<div class="card-header shadow" style="top: 0px; background-color: #cc5500;">' + title + '</div>';
           }
            data[keys[i]].forEach(function(r){
            var row_style = "";
            if(r['is_dir']){row_style="background-color: #008080;"}
            rows.push({"name": r['name'],
                        "path": r["path"],
                                "size": r['size'],
                                "mode": r['mode'],
                                "modification_time": r['modification_time'],
                                    "row-style": row_style,
                                    "cell-style": {"hidden": "text-align:center",
                                                        "type":"text-align:center"}
                                });
            });
            output += support_scripts['poseidon_create_table']([{"name":"name", "size":"1em"},{"name":"path", "size":"1em"}, {"name":"size", "size":"1em"},{"name":"mode","size":"1em"} ,{"name": "modification_time", "size": "1em"}], rows);
            total_output += output;
        }
   }
   return total_output;
}