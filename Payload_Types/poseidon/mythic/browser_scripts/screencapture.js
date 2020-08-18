function(task, responses){
  if(task.status === 'error'){return "<pre> Error: Untoggle swtich to see error message(s) </pre>"; }
  let output = "";
  for(let i = 0; i < responses.length; i+=2){
  	if( i+1 < responses.length){
  		//only want to do this if the next response exists, i.e. file_downloaded
  		let status = JSON.parse(responses[i]['response']);
    	let id = status['agent_file_id'];
        output += "<div class='card'><div class='card-header border border-dark shadow'><a class='btn stretched-link' type='button' data-toggle='collapse' data-target='#task" + task['id'] + i + "screencapture' aria-expanded='false' aria-controls='task" + task['id'] + "screencapture'>Finished <font color='red'>Screencapture " + escapeHTML(task['params']) + "</font>. Click to view</div>";
      output += "<div class='collapse' id=\"task" + task['id'] + i + "screencapture\" style='width:100%'>";
      output += "<div class='response-background card-body' style='padding:0;margin:0'><img src='/api/v1.4/files/screencaptures/" + id + "' width='100%'></div></div></div>";
  	}else{
  		output += "<pre> downloading pieces ...</pre>";
  	}
  }
  return output;
}