function(task, responses){
  if(responses.length == 2){
    try{
        var status = JSON.parse(responses[0]['response']);
    }catch(error){
       return JSON.stringify(JSON.parse(responses), null, 2);;
    }
    if(status.hasOwnProperty('id')){
      var output = "<div class='card'><div class='card-header border border-dark shadow'>Finished Downloading <span class='display'>" + task['params'] + "</span>. Click <a href='/api/v1.4/files/download/" + status['agent_file_id'] + "'>here</a> to download</div></div>";
      return output;
    }
  }
  return JSON.stringify(JSON.parse(responses), null, 2);
}