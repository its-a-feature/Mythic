exports.launchapp = function(task, command, params){
     //this should be the bundle identifier like com.apple.itunes to launch
    //it will launch hidden, asynchronously, and will be 'hidden' (still shows up in the dock though)
    let response = "";
	try{
		ObjC.import('AppKit');
		$.NSWorkspace.sharedWorkspace.launchAppWithBundleIdentifierOptionsAdditionalEventParamDescriptorLaunchIdentifier(
		  params,
		  $.NSWorkspaceLaunchAsync | $.NSWorkspaceLaunchAndHide | $.NSWorkspaceLaunchWithoutAddingToRecents,
		  $.NSAppleEventDescriptor.nullDescriptor,
		  null
		);
		return JSON.stringify({"user_output":"Program launched", "completed": true});
	}
	catch(error){
		return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
	}
};
COMMAND_ENDS_HERE