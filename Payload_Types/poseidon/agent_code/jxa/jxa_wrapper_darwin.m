#import <Foundation/Foundation.h>
#import <OSAKit/OSAKit.h>
#include "jxa_wrapper_darwin.h"

char* runjs(char *s) {
    @try {
        NSString *codeString = [NSString stringWithUTF8String:s];
        OSALanguage *lang = [OSALanguage languageForName:@"JavaScript"];
        OSAScript *script = [[OSAScript alloc] initWithSource:codeString language:lang];
        NSDictionary *__autoreleasing compileError = @{};

        [script compileAndReturnError:nil];

        if ([compileError count] > 0) {
            NSString *res = compileError[@"OSAScriptErrorMessageKey"];
            return [res UTF8String];
        }

        NSDictionary *__autoreleasing runError = @{};
        NSAppleEventDescriptor* res = [script executeAndReturnError:nil];

        if ([runError count] > 0) {

            NSString *result = runError[@"OSAScriptErrorMessageKey"];
            return [result UTF8String];
        }
        return [[res stringValue] UTF8String];
    } @catch (NSException *exception) {
        return [[exception reason] UTF8String];
    }
    
}