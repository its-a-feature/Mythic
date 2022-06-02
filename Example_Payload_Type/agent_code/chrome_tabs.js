exports.chrome_tabs = function(task, command, params){
	let tabs = {};
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            for (let i = 0; i < ch.windows.length; i++){
                let win = ch.windows[i];
                tabs["Window " + i] = {};
                for (let j = 0; j < win.tabs.length; j++){
                    let tab = win.tabs[j];
                    tabs["Window " + i]["Tab " + j] = {"title": tab.title(), "url": tab.url()};
                }
            }
        }else{
            return {"user_output": "Chrome is not running", "completed": true, "status": "error"};
        }
	}catch(error){
		let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return {"user_output":err, "completed": true, "status": "error"};
	}
	return {"user_output": JSON.stringify(tabs, null, 2), "completed": true};
};
