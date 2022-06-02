exports.launchapp = function(task, command, params){
     //this should be the bundle identifier like com.apple.itunes to launch
    //it will launch hidden, asynchronously, and will be 'hidden' (still shows up in the dock though)
    let response = "";
	try{
		let command_params = JSON.parse(params);
		if(!command_params.hasOwnProperty('bundle')){ return {"user_output": "missing bundle identifier", "completed": true, "status": "error"}}
		ObjC.import('AppKit');
		$.NSWorkspace.sharedWorkspace.launchAppWithBundleIdentifierOptionsAdditionalEventParamDescriptorLaunchIdentifier(
		  command_params['bundle'],
		  $.NSWorkspaceLaunchAsync | $.NSWorkspaceLaunchAndHide | $.NSWorkspaceLaunchWithoutAddingToRecents,
		  $.NSAppleEventDescriptor.nullDescriptor,
		  null
		);
		return {"user_output":"Program launched", "completed": true};
	}
	catch(error){
		return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
};
