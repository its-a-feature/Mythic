function(task, responses){
	if(task.status === 'error'){
		return "<pre> Error: untoggle for error message(s) </pre>";
	}
	try{
		if(responses[0]['response'] === "Successfully set the clipboard"){
			return "<pre> Successfully set the clipboard </pre>";
		}
		let data = JSON.parse(responses[0]['response']);
		let output = "";
		let key_list = [];
		let specified = false;
		for(const [key, value] of Object.entries(data)){
			key_list.push(key);
			if(key === "public.utf8-plain-text"){
				output = atob(value);
			}else if(value !== ""){
				specified = true;
			}
		}
		if(specified){
			return "<pre>All Keys: " + key_list.join(", ") + "\n" + responses[0]['response'] + "</pre>";
		}else{
			return "<pre>All Keys: " + key_list.join(", ") + "\nPlaintext Data:\n" + output + "</pre>";
		}

	}catch(error){
		return "<pre> Error: untoggle for parsing error message(s) </pre>";
	}
}