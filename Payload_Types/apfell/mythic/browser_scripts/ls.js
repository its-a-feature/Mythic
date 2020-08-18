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
		let xattr = [];
		for(const [key, value] of Object.entries(perm_data)){
		    if(key === "owner"){row['owner'] = escapeHTML(value);}
		    else if(key === "group"){row['group'] = escapeHTML(value);}
		    else if(key === "posix"){row['posix'] = escapeHTML(value);}
		    else if(key.includes(".")){xattr.push(escapeHTML(key))}
        }
		row['xattr'] = xattr.join("<br>");
		rows.push(row);
	    if(!data.hasOwnProperty('files')){data['files'] = []}
	    data['files'].forEach(function(r){
    		let row_style = "";
            if( !r['is_file'] ){ row_style = "background-color: #5E28DC"}
            let row = {"name": escapeHTML(r['name']), "size": escapeHTML(r['size']), "row-style": row_style, "cell-style": {}};
            let perm_data = r['permissions'];
            let xattr = [];
            for(const [key, value] of Object.entries(perm_data)){
                if(key === "owner"){row['owner'] = escapeHTML(value);}
                else if(key === "group"){row['group'] = escapeHTML(value);}
                else if(key === "posix"){row['posix'] = escapeHTML(value);}
                else if(key.includes(".")){xattr.push(escapeHTML(key))}
            }
            row['xattr'] = xattr.join("<br>");
            rows.push(row);
		});
	}
    	return support_scripts['apfell_create_table']([
    	    {"name":"name", "size":"10em"},
            {"name":"size", "size":"2em"},
            {"name":"owner","size":"3em"},
            {"name":"group", "size": "2em"},
            {"name":"posix", "size":"2em"},
            {"name":"xattr", "size": "1em"}], rows);
    }catch(error){
        console.log(error);
        return  "<pre> Error: untoggle for error message(s) </pre>";
    }
}