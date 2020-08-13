exports.chrome_bookmarks = function(task, command, params){
	let all_data = [];
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            let folders = ch.bookmarkFolders;
            for (let i = 0; i < folders.length; i ++){
                let folder = folders[i];
                let bookmarks = folder.bookmarkItems;
                all_data.push("Folder Name: " + folder.title());
                for (let j = 0; j < bookmarks.length; j++){
                    let info = "Title: " + bookmarks[j].title() +
                    "\nURL: " + bookmarks[j].url() +
                    "\nindex: " + bookmarks[j].index() +
                    "\nFolder/bookmark: " + i + "/" + j;
                    all_data.push(info); //populate our array
                }
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
	return {"user_output": all_data, "completed": true};
};
