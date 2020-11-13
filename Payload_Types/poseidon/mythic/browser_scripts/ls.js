function(task, responses){
	if(task.status === 'error'){
		return "<pre> Error: untoggle for error message(s) </pre>";
	}else if(responses[0]['response'] === "added data to file browser"){
	    return "<pre>added data to file browser</pre>";
    }
  let rows = [];
  try{
  	for(let i = 0; i < responses.length; i++){
        let data = JSON.parse(responses[i]['response']);
        let row_style = "";
        if( !data['is_file'] ){ row_style = "background-color: #5E28DC"}
		let row = {"name": escapeHTML(data['name']), "size": escapeHTML(data['size']), "row-style": row_style, "cell-style": {}};
		let perm_data = data['permissions'];
		row['permissions'] = perm_data["permissions"];
		rows.push(row);
	    if(!data.hasOwnProperty('files')){data['files'] = []}
	    data['files'].forEach(function(r){
    		let row_style = "";
            if( !r['is_file'] ){ row_style = "background-color: #5E28DC"}
            let row = {"name": escapeHTML(r['name']), "size": escapeHTML(r['size']), "row-style": row_style, "cell-style": {}};
            let perm_data = r['permissions'];
            perm_data = data['permissions'];
			row['permissions'] = perm_data["permissions"];
			rows.push(row);
		});
	}
    	return support_scripts['poseidon_create_table']([
    	    {"name":"name", "size":"10em"},
            {"name":"size", "size":"2em"},
            {"name":"permissions","size":"3em"}], rows);
    }catch(error){
        console.log(error);
        return  "<pre> Error: untoggle for error message(s) </pre>";
    }
}