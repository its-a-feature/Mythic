function(task, responses){
	try{
		let ent = JSON.parse(responses[0]['response']);
		let interesting = ["com.apple.security.cs.allow-jit",
			"com.apple.security.cs.allow-unsigned-executable-memory",
			"com.apple.security.cs.allow-dyld-environment-variables",
			"com.apple.security.cs.disable-library-validation",
			"com.apple.security.cs.disable-executable-page-protection",
			"com.apple.security.cs.debugger", "No Entitlements"];
		let dict = {};
		for(let i = 0; i < ent.length; i++){
			if(ent[i]['code_sign'].toString(16).substring(1,2) !== "6"){
				dict[ent[i]['process_id']] = {};
				dict[ent[i]['process_id']]['bin_path'] = ent[i]['bin_path'];
				dict[ent[i]['process_id']]['code_sign'] = "0x" + ent[i]['code_sign'].toString(16);
				try{
					for(let j = 0; j < interesting.length; j++){
						if(ent[i]['entitlements'].includes(interesting[j])){
							dict[ent[i]['process_id']]['entitlements'] = JSON.parse(ent[i]['entitlements']);
							break;
						}
					}

				}catch(err){
					dict[ent[i]['process_id']]['entitlements'] = ent[i]['entitlements'];
				}
			}
		}
		return "<pre>" + JSON.stringify(dict, null, 6) + "</pre>";
	}catch(error){
		return "<pre>" + error.toString() + JSON.stringify(responses, null, 6) +  "</pre>";
	}
}