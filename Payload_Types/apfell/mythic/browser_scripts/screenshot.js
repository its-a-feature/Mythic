function(task, responses){
    if(task.status === 'processing'){
  	    return "<pre> downloading pieces ...</pre>";
      }if(task.status === 'error'){
        return "<pre> Error: Untoggle swtich to see error message(s) </pre>";
      }
  if(responses.length === 2){
    try{
        let status = JSON.parse(responses[1]['response']);
    	let id = status['file_id'];
        let output = "<div class='card'><div class='card-header border border-dark shadow'><a class='btn stretched-link' type='button' data-toggle='collapse' data-target='#task" + task['id'] + "screencapture' aria-expanded='false' aria-controls='task" + task['id'] + "screencapture' style='padding:0'>Finished <font color='red'>Screencapture " + task['params'] + "</font>. Click to view</div>";
      output += "<div class='collapse' id=\"task" + task['id'] + "screencapture\" style='width:100%'>";
      output += "<div class='response-background card-body' style='padding:0'><img src='/api/v1.4/files/screencaptures/" + id + "' width='100%'></div></div></div>";
		      return output;
    }catch(error){
       return "<pre>Error: " + error.toString() + "\n" + JSON.stringify(responses, null, 2) + "</pre>";
    }
  }
  
}