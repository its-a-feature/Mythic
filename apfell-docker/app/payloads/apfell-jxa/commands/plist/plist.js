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
                    //console.log(files);
                    output["localLaunchAgents"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        nsposix = contents['NSFilePosixPermissions'];
                        // we need to fix this mess to actually be real permission bits that make sense
                        posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                        contents['NSFilePosixPermissions'] = posix;
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
                                output["localLaunchAgents"][files[i]]['attributes'] = trimmed_attributes;
                            }
                        }
                    }
                }catch(error){
                    return JSON.stringify({"user_output":"Error trying to read ~/Library/LaunchAgents: " + error.toString(), "completed": true, "status": "error"});
                }
                path = "/Library/LaunchAgents/";
                files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["systemLaunchAgents"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile($(path + files[i]));
                        let contents = ObjC.deepUnwrap(prefs);
                        nsposix = contents['NSFilePosixPermissions'];
                        // we need to fix this mess to actually be real permission bits that make sense
                        posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                        contents['NSFilePosixPermissions'] = posix;
                        output['systemLaunchAgents'][files[i]] = {};
                        output["systemLaunchAgents"][files[i]]['contents'] = contents;
                        if(contents != undefined && contents.hasOwnProperty("ProgramArguments")){
                            var attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes != undefined){
                                var trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                var nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                var posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                                trimmed_attributes['NSFilePosixPermissions'] = posix;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["systemLaunchAgents"][files[i]]['attributes'] = trimmed_attributes;
                            }
                        }
                    }
                }
                catch(error){
                    return JSON.stringify({"user_output":"Error trying to read /Library/LaunchAgents: " + error.toString(), "completed": true, "status": "error"});
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
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile($(path + files[i]));
                        let contents = ObjC.deepUnwrap(prefs);
                        let nsposix = contents['NSFilePosixPermissions'];
                        // we need to fix this mess to actually be real permission bits that make sense
                        let posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                        contents['NSFilePosixPermissions'] = posix;
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
                                output["systemLaunchDaemons"][files[i]]['attributes'] = trimmed_attributes;
                            }
                        }
                    }
                }
                catch(error){
                    return JSON.stringify({"user_output":"Failed to read launch daemons: " + error.toString(), "completed": true, "status": "error"});
                }
            }
            return JSON.stringify({"user_output":JSON.stringify(output, null, 2), "completed": true});
        }catch(error){
            return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
        }
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
};
COMMAND_ENDS_HERE
