// the base64 decode function to handle unicode was pulled from the following stack overflow post
// https://stackoverflow.com/a/30106551
export function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    try{
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }catch(error){
        return atob(str);
    }

}