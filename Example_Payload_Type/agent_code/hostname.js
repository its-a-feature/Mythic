exports.hostname = function(task, command, params){
	let output = {};
	output['localized'] = ObjC.deepUnwrap($.NSHost.currentHost.localizedName);
	output['names'] = ObjC.deepUnwrap($.NSHost.currentHost.names);
	let fileManager = $.NSFileManager.defaultManager;
	if(fileManager.fileExistsAtPath("/Library/Preferences/SystemConfiguration/com.apple.smb.server.plist")){
		let dict = $.NSMutableDictionary.alloc.initWithContentsOfFile("/Library/Preferences/SystemConfiguration/com.apple.smb.server.plist");
		let contents = ObjC.deepUnwrap(dict);
		output['Local Kerberos Realm'] = contents['LocalKerberosRealm'];
		output['NETBIOS Name'] = contents['NetBIOSName'];
		output['Server Description'] = contents['ServerDescription'];
	}
	return {"user_output": JSON.stringify(output, null, 2), "completed": true};
};

    