#import "foundation_darwin.h"
const char*
nsstring2cstring(NSString *s) {
    if (s == NULL) { return NULL; }

    const char *cstr = [s UTF8String];
    return cstr;
}

const NSString* GetOSVersion(){
    NSString * operatingSystemVersionString = [[NSProcessInfo processInfo] operatingSystemVersionString];
    return operatingSystemVersionString;
}