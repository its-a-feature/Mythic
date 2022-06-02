exports.code_signatures = function(task, command, params){
    ObjC.import("Security");
	let staticCode = Ref();
	try{
	    let binpath = JSON.parse(params)["path"];
	    if(binpath === undefined || binpath === null){
	        return {"user_output": "Missing Path to examine", "completed": true, "status": "error"};
        }
        let path = $.CFURLCreateFromFileSystemRepresentation($.kCFAllocatorDefault, binpath, binpath.length, true);
        $.SecStaticCodeCreateWithPath(path, 0, staticCode);
        let codeInfo = Ref();
        $.SecCodeCopySigningInformation(staticCode[0], 0x7F, codeInfo);
        ObjC.bindFunction('CFMakeCollectable', ['id', ['void *'] ]);
        let codeInfo_c = $.CFMakeCollectable(codeInfo[0]);
        let code_json = ObjC.deepUnwrap(codeInfo_c);
        if(code_json === undefined){
            return {"user_output": "Failed to find specified path", "completed": true, "status": "error"};
        }
        if(code_json.hasOwnProperty("flags")){
            let flag_details = [];
            if( code_json["flags"] & 0x000001 ){flag_details.push({"0x000001": "kSecCodeSignatureHost - May host guest code"})}
            if( code_json["flags"] & 0x000002 ){flag_details.push({"0x000002": "kSecCodeSignatureAdhoc - The code has been sealed without a signing identity"})}
            if( code_json["flags"] & 0x000100 ){flag_details.push({"0x000100": "kSecCodeSignatureForceHard - The code prefers to be denied access to a resource if gaining such access would cause its invalidation"})}
            if( code_json["flags"] & 0x000200 ){flag_details.push({"0x000200": "kSecCodeSignatureForceKill - The code wishes to be terminated if it is ever invalidated"})}
            if( code_json["flags"] & 0x000400 ){flag_details.push({"0x000400": "kSecCodeSignatureForceExpiration - Code signatures made by expired certificates be rejected"})}
            if( code_json["flags"] & 0x000800 ){flag_details.push({"0x000800": "kSecCodeSignatureRestrict - Restrict dyld loading"})}
            if( code_json["flags"] & 0x001000 ){flag_details.push({"0x001000": "kSecCodeSignatureEnforcement - Enforce code signing"})}
            if( code_json["flags"] & 0x002000 ){flag_details.push({"0x002000": "kSecCodeSignatureLibraryValidation - Require library validation"})}
            if( code_json["flags"] & 0x010000 ){flag_details.push({"0x010000": "kSecCodeSignatureRuntime - Apply runtime hardening policies as required by the hardened runtime version"})}
            code_json["flag_details"] = flag_details;
            code_json["flags"] = "0x" + code_json["flags"].toString(16);
        }
        return {"user_output":JSON.stringify(code_json, null, 2), "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
