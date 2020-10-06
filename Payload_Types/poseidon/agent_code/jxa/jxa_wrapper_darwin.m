#import <Foundation/Foundation.h>
#import <OSAKit/OSAKit.h>
#include "jxa_wrapper_darwin.h"

char* runjs(char *s) {
    @try {
            NSString *codeString = [NSString stringWithUTF8String:s];
            OSALanguage *lang = [OSALanguage languageForName:@"JavaScript"];
            OSAScript *script = [[OSAScript alloc] initWithSource:codeString language:lang];

            NSDictionary *__autoreleasing runError =nil;
            NSAppleEventDescriptor* res = [script executeAndReturnError:&runError];

            if ([runError count] > 0) {

                NSString *result = runError[@"OSAScriptErrorMessageKey"];
                return [result UTF8String];
            }
            NSString* fmtString = [NSString stringWithFormat:@"%@", res];
            char* output = [fmtString UTF8String];
            return output;
    } @catch (NSException *exception) {
        return [[exception reason] UTF8String];
    }
    
}