exports.clipboard = function(task, command, params){
    let response = "";
    ObjC.import('AppKit');
    if(params !== undefined && params !== ""){
        // Try setting the clipboard to whatever is in params
        try{
            $.NSPasteboard.generalPasteboard.clearContents;
            $.NSPasteboard.generalPasteboard.setStringForType($(params), $.NSPasteboardTypeString);
            return JSON.stringify({"user_output": "Successfully set the clipboard", "completed": true});
        }
        catch(error){
            return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
        }
    }
    else{
        //try just reading the clipboard data and returning it
        try{
            let pb = $.NSPasteboard.generalPasteboard;
            let output = pb.stringForType($.NSPasteboardTypeString).js;
            //var output = currentApp.theClipboard();
            if(output === "" || output === undefined){
                return JSON.stringify({"user_output":"Nothing on the clipboard", "completed": true});
            }
            return JSON.stringify({"user_output": String(output), "completed": true});
        }
        catch(error){
            return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
        }
    }
};
COMMAND_ENDS_HERE