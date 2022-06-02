exports.list_users = function(task, command, params){
    let all_users = [];
    let gid = -1;
    if (params.length > 0) {
        var data = JSON.parse(params);
        if (data.hasOwnProperty('gid') && data['gid'] !== "" && data['gid'] > 0) {
            gid = data['gid'];
        }
    }
    ObjC.import('Collaboration');
    ObjC.import('CoreServices');
    if (gid < 0) {
        let defaultAuthority = $.CBIdentityAuthority.defaultIdentityAuthority;
        let grouptolook = 1000 //Most systems don't have groups past 700s
        for (let x = 0; x < grouptolook; x++) {
            let group = $.CBGroupIdentity.groupIdentityWithPosixGIDAuthority(x, defaultAuthority);
            let validGroupcheck = group.toString()
            if (validGroupcheck === "[id CBGroupIdentity]") {
                let results = group.memberIdentities.js;

                let numResults = results.length;
                for (let i = 0; i < numResults; i++) {
                    let idObj = results[i];
                    let info = {
                        "POSIXName": idObj.posixName.js,
                        "POSIXID": idObj.posixUID,
                        "POSIXGID": group.posixGID,
                        "LocalAuthority": idObj.authority.localizedName.js,
                        "FullName": idObj.fullName.js,
                        "Emails": idObj.emailAddress.js,
                        "isHiddenAccount": idObj.isHidden,
                        "Enabled": idObj.isEnabled,
                        "Aliases": ObjC.deepUnwrap(idObj.aliases),
                        "UUID": idObj.UUIDString.js
                    };
                    all_users.push(info);
                }

            }
        }
        return {
            "user_output": JSON.stringify(all_users, null, 2),
            "completed": true
        }
    } else {
        let defaultAuthority = $.CBIdentityAuthority.defaultIdentityAuthority;
        let group = $.CBGroupIdentity.groupIdentityWithPosixGIDAuthority(gid, defaultAuthority);
        let results = group.memberIdentities.js;
        let numResults = results.length;
        for (let i = 0; i < numResults; i++) {
            let idObj = results[i];
            let info = {
                "POSIXName": idObj.posixName.js,
                "POSIXID": idObj.posixUID,
                "POSIXGID": group.posixGID,
                "LocalAuthority": idObj.authority.localizedName.js,
                "FullName": idObj.fullName.js,
                "Emails": idObj.emailAddress.js,
                "isHiddenAccount": idObj.isHidden,
                "Enabled": idObj.isEnabled,
                "Aliases": ObjC.deepUnwrap(idObj.aliases),
                "UUID": idObj.UUIDString.js
            };
            all_users.push(info);
        }
    }
    return {
        "user_output": JSON.stringify(all_users, null, 2),
        "completed": true
    };
};