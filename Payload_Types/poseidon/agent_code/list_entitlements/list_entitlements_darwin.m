#include "list_entitlements_darwin.h"

//
//  CSOps.c
//  CSOps

/**
* Copyright (C) 2012 Yogesh Prem Swami. All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
*/


#include <unistd.h>		// getpid()
#include <stdio.h>		// printf() etc
#include <stdlib.h>		// atoi()
#include <string.h>		// strlen()
#include <errno.h>		// strerror()
#include <sys/syslimits.h>	// PATH_MAX
#include <CommonCrypto/CommonDigest.h>	// SHA_HASH_LENGTH.
#import <Foundation/Foundation.h>

#define MAX_CSOPS_BUFFER_LEN 3*PATH_MAX	 // 3K < 1 page

static char BUFFER[512000];
static uint32_t int_buffer;
static off_t		  off_buffer;

typedef void (^describe_t)(void);
static pid_t process_id;

static struct csops_struct{
	describe_t	describe; // These are the things that make blocks shine
	unsigned int ops;
	void*	 useraddr;
	size_t	 usersize;
}CSOPS[] = {
	/* Get the entitlement blob. */
	{
		.ops		  = CS_OPS_ENTITLEMENTS_BLOB,
		.useraddr	  = (void*)BUFFER,
		.usersize	  = (512000)
	}
};


#define CSOPS_SIZE (sizeof(CSOPS)/sizeof(CSOPS[0]))


char* exec_csops( int proc_id){
    int result;
    int i;
	struct csops_struct* cs;
	memset(BUFFER, 0, 512000);
    cs = &CSOPS[0];
    process_id = proc_id;
	result = csops(process_id, cs->ops, cs->useraddr, cs->usersize);

	if (result < 0) {
		return strerror(errno);
	}else{
        if (  ((char*)(cs->useraddr))[0] != 0x00 ){
            return parse_plist( ((char*)(cs->useraddr)) + 8 );
        }else{
            return "No Entitlements";
        }
	}
}

int exec_csops_status( int proc_id){
    int result;
    int i;
	struct csops_struct* cs;
	uint32_t int_buffer;
    cs = &CSOPS[0];
    process_id = proc_id;
	result = csops(process_id, CS_OPS_STATUS, (void*)&int_buffer, sizeof(int_buffer));

	if (result < 0) {
		return -1;
	}else{
        return int_buffer;
	}
}
char* parse_plist( char* plist_string){
    NSString* plistString = [NSString stringWithUTF8String:plist_string];
    NSData* plistData = [plistString dataUsingEncoding:NSUTF8StringEncoding];
    NSPropertyListFormat* format;
    NSString* error;
    NSDictionary* plist = [NSPropertyListSerialization propertyListWithData:plistData options:NSPropertyListImmutable format:&format error:&error];
    NSData * jsonData = [NSJSONSerialization  dataWithJSONObject:plist options:0 error:&error];
    NSString * myString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return [myString UTF8String];
}