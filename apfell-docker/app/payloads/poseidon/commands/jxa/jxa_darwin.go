// +build darwin

package jxa
/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Foundation -framework OSAKit
#include "main.h"
#import <Foundation/Foundation.h>
#import <OSAKit/OSAKit.h>

char* runjs(char *s) {
    @try {
        NSString *codeString = [NSString stringWithUTF8String:s];
        OSALanguage *lang = [OSALanguage languageForName:@"JavaScript"];
        OSAScript *script = [[OSAScript alloc] initWithSource:codeString language:lang];
        NSDictionary *__autoreleasing compileError;
        NSDictionary *__autoreleasing runError;
		[script compileAndReturnError:&compileError];

		if (compileError != nil) {
			NSString *res = runError[@"OSAScriptErrorMessageKey"];
            return [res UTF8String];
		}

		NSAppleEventDescriptor* res = [script executeAndReturnError:&runError];
		if (runError != nil) {
            NSString *res = runError[@"OSAScriptErrorMessageKey"];
            return [res UTF8String];
		}
		
        NSString *result = [res stringValue];
        return [result UTF8String];
    } @catch (NSException *exception) {
        NSString *r = [exception reason];
        return [r UTF8String];
    }
}
*/
import "C"

import (
	"encoding/base64"
)


type JxaRunDarwin struct {
	Successful bool
	Results string
}

func (j *JxaRunDarwin) Success() bool {
	return j.Successful
}

func (j *JxaRunDarwin) Result() string {
	return j.Results
}

func runCommand(encpayload string) (JxaRunDarwin, error) {
	rawpayload, err := base64.StdEncoding.DecodeString(encpayload)
	if err != nil {
		empty := JxaRunDarwin{}
		return empty, err
	}

	cpayload := C.CString(string(rawpayload))
	cresult := C.runjs(cpayload)
	result := C.GoString(cresult)

	r := JxaRunDarwin{}
	r.Successful = true 
	r.Results = result
	return r, nil
}