exports.plist = function(task, command, params){
    try{
        let config = JSON.parse(params);
        ObjC.import('Foundation');
        let output = [];
        try{
            if(config['type'] === "read"){
                output = [];
                let filename = $.NSString.alloc.initWithUTF8String(config['filename']);
                let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(filename);
                let contents = ObjC.deepUnwrap(prefs);
                let fileManager = $.NSFileManager.defaultManager;
                let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(config['filename']), $()));
                let nsposix = {};
                let posix = "";
                if(plistPerms !== undefined){
                    nsposix = plistPerms['NSFilePosixPermissions'].js;
                    posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                    if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                        let extended = {};
                        let perms = plistPerms['NSFileExtendedAttributes'].js;
                        for(let j in perms){
                            extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                        }
                        contents['PlistPermissionsExtendedAttributes'] = extended;
                    }
                }
                // we need to fix this mess to actually be real permission bits that make sense
                contents['PlistPermissions'] = posix;
                output.push(contents);
            }
            else if(config['type'] === "readLaunchAgents"){
                output = {};
                let fileManager = $.NSFileManager.defaultManager;
                let error = Ref();
                let path = fileManager.homeDirectoryForCurrentUser.fileSystemRepresentation + "/Library/LaunchAgents/";
                let files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["localLaunchAgents"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + files[i]), $()));
                        let nsposix = {};
                        let posix = "";
                        if(plistPerms !== undefined){
                            nsposix = plistPerms['NSFilePosixPermissions'].js;
                            posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                            if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                                let extended = {};
                                let perms = plistPerms['NSFileExtendedAttributes'].js;
                                for(let j in perms){
                                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                                }
                                contents['PlistPermissionsExtendedAttributes'] = extended;
                            }
                        }
                        // we need to fix this mess to actually be real permission bits that make sense
                        contents['PlistPermissions'] = posix;
                        output["localLaunchAgents"][files[i]] = {};
                        output["localLaunchAgents"][files[i]]['contents'] = contents;
                        if(contents !== undefined && contents.hasOwnProperty("ProgramArguments")){
                            //now try to get the attributes of the program this plist points to since it might have attribute issues for abuse
                            let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes !== undefined){
                                let trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                                trimmed_attributes['NSFilePosixPermissions'] = posix;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["localLaunchAgents"][files[i]]['ProgramAttributes'] = trimmed_attributes;
                            }
                        }
                    }
                }catch(error){
                    return {"user_output":"Error trying to read ~/Library/LaunchAgents: " + error.toString(), "completed": true, "status": "error"};
                }
                path = "/Library/LaunchAgents/";
                files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["systemLaunchAgents"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + files[i]), $()));
                        let nsposix = {};
                        let posix = "";
                        if(plistPerms !== undefined){
                            nsposix = plistPerms['NSFilePosixPermissions'].js;
                            posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                            if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                                let extended = {};
                                let perms = plistPerms['NSFileExtendedAttributes'].js;
                                for(let j in perms){
                                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                                }
                                contents['PlistPermissionsExtendedAttributes'] = extended;
                            }
                        }
                        // we need to fix this mess to actually be real permission bits that make sense
                        contents['PlistPermissions'] = posix;
                        output['systemLaunchAgents'][files[i]] = {};
                        output["systemLaunchAgents"][files[i]]['contents'] = contents;
                        if(contents !== undefined && contents.hasOwnProperty("ProgramArguments")){
                            let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes !== undefined){
                                let trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                let nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                trimmed_attributes['NSFilePosixPermissions'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["systemLaunchAgents"][files[i]]['ProgramAttributes'] = trimmed_attributes;
                            }
                        }
                    }
                }
                catch(error){
                    return {"user_output":"Error trying to read /Library/LaunchAgents: " + error.toString(), "completed": true, "status": "error"};
                }
            }
            else if(config['type'] === "readLaunchDaemons"){
                let fileManager = $.NSFileManager.defaultManager;
                let path = "/Library/LaunchDaemons/";
                let error = Ref();
                output = {};
                let files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["systemLaunchDaemons"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        if(contents === undefined){ contents = {};}
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + files[i]), $()));
                        let nsposix = {};
                        let posix = "";
                        if(plistPerms !== undefined){
                            nsposix = plistPerms['NSFilePosixPermissions'].js;
                            posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                            if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                                let extended = {};
                                let perms = plistPerms['NSFileExtendedAttributes'].js;
                                for(let j in perms){
                                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                                }
                                contents['PlistPermissionsExtendedAttributes'] = extended;
                            }
                        }
                        // we need to fix this mess to actually be real permission bits that make sense
                        contents['PlistPermissions'] = posix;
                        output['systemLaunchDaemons'][files[i]] = {};
                        output["systemLaunchDaemons"][files[i]]['contents'] = contents;
                        if(contents !== undefined && contents.hasOwnProperty('ProgramArguments')){
                            let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes !== undefined){
                                let trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                                trimmed_attributes['NSFilePosixPermissions'] = posix;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["systemLaunchDaemons"][files[i]]['ProgramAttributes'] = trimmed_attributes;
                            }
                        }
                    }
                }
                catch(error){
                    return {"user_output":"Failed to read launch daemons: " + error.toString(), "completed": true, "status": "error"};
                }
            }
            return {"user_output":JSON.stringify(output, null, 2), "completed": true};
        }catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

