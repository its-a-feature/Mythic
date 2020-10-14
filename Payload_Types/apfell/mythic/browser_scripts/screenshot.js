function(task, responses){
    if(task.status === 'error'){
        return "<pre> Error: Untoggle swtich to see error message(s) </pre>";
      }
    if(task.completed){
        try{
            let status = JSON.parse(responses[0]['response']);
            let id = status['agent_file_id'];
            let output = "<div class='card'><div class='card-header border border-dark shadow'><a class='btn stretched-link' type='button' data-toggle='collapse' data-target='#task" + task['id'] + "screencapture' aria-expanded='false' aria-controls='task" + task['id'] + "screencapture' style='padding:0'>Finished <font color='red'>Screencapture</font>. Click to view</div>";
          output += "<div class='collapse' id=\"task" + task['id'] + "screencapture\" style='width:100%'>";
          output += "<div class='response-background card-body' style='padding:0'><img src='/api/v1.4/files/screencaptures/" + escapeHTML(id) + "' width='100%'></div></div></div>";
                  return output;
        }catch(error){
           return "<pre>Error: " + error.toString() + "\n" + JSON.stringify(responses, null, 2) + "</pre>";
        }
      }
    if(task.status === 'processing' || task.status === "processed"){
  	    return "<pre> downloading pieces ...</pre>";
      }
}