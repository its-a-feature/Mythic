/*
 https://github.com/littlstar/b64.c
 The MIT License (MIT)
 
 Copyright (c) 2014 Little Star Media, Inc.
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */


#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include "base64.h"

unsigned char *
b64_decode (const char *src, unsigned int *final_len) {
    int i = 0;
    int j = 0;
    int l = 0;
    size_t size = 0;
    size_t len = *final_len; //this will get updated at the end
    unsigned char *dec = NULL;
    unsigned char buf[3];
    unsigned char tmp[4];
    
    // alloc
    dec = (unsigned char *) malloc(1);
    if (NULL == dec) { return NULL; }
    
    // parse until end of source
    while (len--) {
        // break if char is `=' or not base64 char
        if ('=' == src[j]) { break; }
        if (!(isalnum(src[j]) || '+' == src[j] || '/' == src[j])) { break; }
        
        // read up to 4 bytes at a time into `tmp'
        tmp[i++] = src[j++];
        
        // if 4 bytes read then decode into `buf'
        if (4 == i) {
            // translate values in `tmp' from table
            for (i = 0; i < 4; ++i) {
                // find translation char in `b64_table'
                for (l = 0; l < 64; ++l) {
                    if (tmp[i] == b64_table[l]) {
                        tmp[i] = l;
                        break;
                    }
                }
            }
            
            // decode
            buf[0] = (tmp[0] << 2) + ((tmp[1] & 0x30) >> 4);
            buf[1] = ((tmp[1] & 0xf) << 4) + ((tmp[2] & 0x3c) >> 2);
            buf[2] = ((tmp[2] & 0x3) << 6) + tmp[3];
            
            // write decoded buffer to `dec'
            dec = (unsigned char *) realloc(dec, size + 3);
            if (dec != NULL){
                for (i = 0; i < 3; ++i) {
                    dec[size++] = buf[i];
                }
            } else {
                return NULL;
            }
            
            // reset
            i = 0;
        }
    }
    
    // remainder
    if (i > 0) {
        // fill `tmp' with `\0' at most 4 times
        for (j = i; j < 4; ++j) {
            tmp[j] = '\0';
        }
        
        // translate remainder
        for (j = 0; j < 4; ++j) {
            // find translation char in `b64_table'
            for (l = 0; l < 64; ++l) {
                if (tmp[j] == b64_table[l]) {
                    tmp[j] = l;
                    break;
                }
            }
        }
        
        // decode remainder
        buf[0] = (tmp[0] << 2) + ((tmp[1] & 0x30) >> 4);
        buf[1] = ((tmp[1] & 0xf) << 4) + ((tmp[2] & 0x3c) >> 2);
        buf[2] = ((tmp[2] & 0x3) << 6) + tmp[3];
        
        // write remainer decoded buffer to `dec'
        dec = (unsigned char *) realloc(dec, size + (i - 1));
        if (dec != NULL){
            for (j = 0; (j < i - 1); ++j) {
                dec[size++] = buf[j];
            }
        } else {
            return NULL;
        }
    }
    
    // Make sure we have enough space to add '\0' character at end.
    dec = (unsigned char *) realloc(dec, size + 1);
    if (dec != NULL){
        dec[size] = '\0';
    } else {
        return NULL;
    }
    *final_len = size;
    return dec;
}
char *
b64_encode (const unsigned char *src, unsigned int len) {
    int i = 0;
    int j = 0;
    char *enc = NULL;
    size_t size = 0;
    unsigned char buf[4];
    unsigned char tmp[3];
    
    // alloc
    enc = (char *) malloc(1);
    if (NULL == enc) { return NULL; }
    
    // parse until end of source
    while (len--) {
        // read up to 3 bytes at a time into `tmp'
        tmp[i++] = *(src++);
        
        // if 3 bytes read then encode into `buf'
        if (3 == i) {
            buf[0] = (tmp[0] & 0xfc) >> 2;
            buf[1] = ((tmp[0] & 0x03) << 4) + ((tmp[1] & 0xf0) >> 4);
            buf[2] = ((tmp[1] & 0x0f) << 2) + ((tmp[2] & 0xc0) >> 6);
            buf[3] = tmp[2] & 0x3f;
            
            // allocate 4 new byts for `enc` and
            // then translate each encoded buffer
            // part by index from the base 64 index table
            // into `enc' unsigned char array
            enc = (char *) realloc(enc, size + 4);
            for (i = 0; i < 4; ++i) {
                enc[size++] = b64_table[buf[i]];
            }
            
            // reset index
            i = 0;
        }
    }
    
    // remainder
    if (i > 0) {
        // fill `tmp' with `\0' at most 3 times
        for (j = i; j < 3; ++j) {
            tmp[j] = '\0';
        }
        
        // perform same codec as above
        buf[0] = (tmp[0] & 0xfc) >> 2;
        buf[1] = ((tmp[0] & 0x03) << 4) + ((tmp[1] & 0xf0) >> 4);
        buf[2] = ((tmp[1] & 0x0f) << 2) + ((tmp[2] & 0xc0) >> 6);
        buf[3] = tmp[2] & 0x3f;
        
        // perform same write to `enc` with new allocation
        for (j = 0; (j < i + 1); ++j) {
            enc = (char *) realloc(enc, size + 1);
            enc[size++] = b64_table[buf[j]];
        }
        
        // while there is still a remainder
        // append `=' to `enc'
        while ((i++ < 3)) {
            enc = (char *) realloc(enc, size + 1);
            enc[size++] = '=';
        }
    }
    
    // Make sure we have enough space to add '\0' character at end.
    enc = (char *) realloc(enc, size + 1);
    enc[size] = '\0';
    
    return enc;
}
