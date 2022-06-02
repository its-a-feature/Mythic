exports.terminals_read = function(task, command, params){
    let split_params = {};
    try{
        split_params = JSON.parse(params);
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
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
                    "Frontmost": windows[i].frontmost(),
                    "tabs": []
                };
                let all_tabs = [];
                // store the windows information in id_win in all_data
                all_data["window_" + i] = win_info;
                for(let j = 0; j < windows[i].tabs.length; j++){
                    let tab_info = {
                        "tab": j,
                        "Busy": windows[i].tabs[j].busy(),
                        "Processes": windows[i].tabs[j].processes(),
                        "Selected": windows[i].tabs[j].selected(),
                        "TTY": windows[i].tabs[j].tty()
                    };
                    if(windows[i].tabs[j].titleDisplaysCustomTitle()){
                        tab_info["CustomTitle"] =  windows[i].tabs[j].customTitle();
                    }
                    if(split_params['level'] === 'history'){
                        tab_info["History"] = windows[i].tabs[j].history();
                    }
                    if(split_params['level'] === 'contents'){
                        tab_info["Contents"] = windows[i].tabs[j].contents();
                    }
                    all_tabs.push(tab_info);
                }
                // store all of the tab information corresponding to that window id at id_tabs
                win_info['tabs'] = all_tabs;
            }
        }else{
            return {"user_output":"Terminal is not running", "completed": true, "status": "error"};
        }

	}catch(error){
	    return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
	let output = JSON.stringify(all_data, null, 2);
	return {"user_output":output, "completed": true};
};
