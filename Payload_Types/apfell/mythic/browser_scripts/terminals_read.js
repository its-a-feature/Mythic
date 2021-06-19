function(task, responses){
  let output = "";
  if(task.status === 'error'){
  	return "<pre> Error: untoggle for error message(s) </pre>";
  }
  for(let i = 0; i < responses.length; i++){
    try{
        let data = JSON.parse(responses[i]['response']);
        for (const [key, value] of Object.entries(data)) {
		  output += '<div class="card-header shadow" style="top: 0px; background-color: #393485; color: white;">' +
	      escapeHTML(key) + " with title: " + "\"" + escapeHTML(value['Name']) + "\""
	      + '</div>';
	      for(let j = 0; j < value['tabs'].length; j++){
	      	output += '<div class="card-header shadow" style="top: 0px; background-color:#228B22; color: white;">' +
		    "tab_" + escapeHTML(value['tabs'][j]['tab']) + " with title: " + "\"" + escapeHTML(value['tabs'][j]['CustomTitle'] )+ "\""
		      + '</div>';
		    output += "<pre>" + escapeHTML(value['tabs'][j]['Contents']) + "</pre>";
	      }
		}
    }
    catch(error){
        return "<pre>Error: " + error.toString() + "\n" + escapeHTML(JSON.stringify(responses, null, 2)) + "</pre>";
    }
  }
  return output;
}
