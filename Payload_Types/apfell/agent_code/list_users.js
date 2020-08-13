exports.list_users = function(task, command, params){
	let all_users = [];
	let gid = -1;
	let groups = false;
	if(params.length > 0){
	    let data = JSON.parse(params);
        if(data.hasOwnProperty('gid') && data['gid'] !== "" && data['gid'] > 0){
            gid = data['gid'];
        }
        if(data.hasOwnProperty("groups") && data['groups'] !== ""){
            groups = data['groups'];
        }
	}
    ObjC.import('Collaboration');
    ObjC.import('CoreServices');
    if(gid < 0){
        let defaultAuthority = $.CSGetLocalIdentityAuthority();
        let identityClass = 2;
        if(groups){
            all_users = []; // we will want to do a dictionary so we can group the members by their GID
        }
        else{
            identityClass = 1; //enumerate users
        }
        let query = $.CSIdentityQueryCreate($(), identityClass, defaultAuthority);
        let error = Ref();
        $.CSIdentityQueryExecute(query, 0, error);
        let results = $.CSIdentityQueryCopyResults(query);
        let numResults = parseInt($.CFArrayGetCount(results));
        if(results.js === undefined){
            results = $.CFMakeCollectable(results);
        }
        for(let i = 0; i < numResults; i++){
            let identity = results.objectAtIndex(i);//results[i];
            let idObj = $.CBIdentity.identityWithCSIdentity(identity);
            if(groups){
                //if we're looking at groups, then we have a different info to print out
                all_users[i] = {};
                all_users[i]["POSIXID"] = idObj.posixGID;
                all_users[i]['aliases'] = ObjC.deepUnwrap(idObj.aliases);
                all_users[i]['fullName'] = ObjC.deepUnwrap(idObj.fullName);
                all_users[i]['POSIXName'] = ObjC.deepUnwrap(idObj.posixName);
                all_users[i]['members'] = [];
                let members = idObj.memberIdentities.js;
                for(let j = 0; j < members.length; j++){
                    let info = {
                        "POSIXName": members[j].posixName.js,
                        "POSIXID":  members[j].posixUID,
                        "LocalAuthority": members[j].authority.localizedName.js,
                        "FullName": members[j].fullName.js,
                        "Emails":  members[j].emailAddress.js,
                        "isHiddenAccount": members[j].isHidden,
                        "Enabled": members[j].isEnabled,
                        "Aliases": ObjC.deepUnwrap(members[j].aliases),
                        "UUID": members[j].UUIDString.js
                    };
                    all_users[i]['members'].push(info);
                }
            }
            else{
                let info = {
                        "POSIXName": idObj.posixName.js,
                        "POSIXID":  idObj.posixUID,
                        "LocalAuthority": idObj.authority.localizedName.js,
                        "FullName": idObj.fullName.js,
                        "Emails":  idObj.emailAddress.js,
                        "isHiddenAccount": idObj.isHidden,
                        "Enabled": idObj.isEnabled,
                        "Aliases": ObjC.deepUnwrap(idObj.aliases),
                        "UUID": idObj.UUIDString.js
                    };
                all_users.push(info);
            }
        }
    }
    else{
        let defaultAuthority = $.CBIdentityAuthority.defaultIdentityAuthority;
        let group = $.CBGroupIdentity.groupIdentityWithPosixGIDAuthority(gid, defaultAuthority);
        let results = group.memberIdentities.js;
        let numResults = results.length;
        for(let i = 0; i < numResults; i++){
            let idObj = results[i];
            let info = {
                        "POSIXName": idObj.posixName.js,
                        "POSIXID":  idObj.posixUID,
                        "LocalAuthority": idObj.authority.localizedName.js,
                        "FullName": idObj.fullName.js,
                        "Emails":  idObj.emailAddress.js,
                        "isHiddenAccount": idObj.isHidden,
                        "Enabled": idObj.isEnabled,
                        "Aliases": ObjC.deepUnwrap(idObj.aliases),
                        "UUID": idObj.UUIDString.js
                    };
            all_users.push(info);
        }
    }
    return {"user_output":JSON.stringify(all_users, null, 2), "completed": true};
};

