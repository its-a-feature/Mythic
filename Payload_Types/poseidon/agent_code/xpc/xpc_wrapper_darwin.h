#ifndef _XPC_WRAPPER_H_
#define _XPC_WRAPPER_H_

#include <stdlib.h>
#include <stdio.h>
#include <xpc/xpc.h>
#include <xpc/connection.h>
#include <sys/utsname.h>
#include <launch.h>

extern xpc_type_t TYPE_ERROR;
extern xpc_type_t TYPE_ARRAY;
extern xpc_type_t TYPE_DATA;
extern xpc_type_t TYPE_DICT;
extern xpc_type_t TYPE_INT64;
extern xpc_type_t TYPE_STRING;
extern xpc_type_t TYPE_UUID;
extern xpc_type_t TYPE_BOOL;
extern xpc_type_t TYPE_DATE;
extern xpc_type_t TYPE_FD;
extern xpc_type_t TYPE_CONNECTION;
extern xpc_type_t TYPE_NULL;
extern xpc_type_t TYPE_SHMEM;
extern xpc_object_t ERROR_CONNECTION_INVALID;
extern xpc_object_t ERROR_CONNECTION_INTERRUPTED;
extern xpc_object_t ERROR_CONNECTION_TERMINATED;

extern xpc_connection_t XpcConnect(char *, uintptr_t, int);
extern void XpcSendMessage(xpc_connection_t, xpc_object_t, bool, bool);
extern void XpcArrayApply(uintptr_t, xpc_object_t);
extern void XpcDictApply(uintptr_t, xpc_object_t);
extern void XpcUUIDGetBytes(void *, xpc_object_t);
extern xpc_object_t XpcLaunchdListServices(char *);
extern xpc_object_t XpcLaunchdServiceControl(char *, int);
extern xpc_object_t XpcLaunchdSubmitJob(char *, char *, int);
extern xpc_object_t XpcLaunchdGetServiceStatus(char *);
extern xpc_object_t XpcLaunchdLoadPlist(char *, int);
extern char* XpcLaunchdGetProcInfo(unsigned long);
extern xpc_object_t XpcLaunchdUnloadPlist(char *);

extern void *objc_retain (void *);
extern int xpc_pipe_routine (xpc_object_t *, xpc_object_t *, xpc_object_t **);
extern char *xpc_strerror (int);
extern int csr_check (int what);

// This is undocumented, but sooooo useful :)
extern mach_port_t xpc_dictionary_copy_mach_send(xpc_object_t, char *key);


// Some of the routine #s launchd recognizes. There are quite a few subsystems
// (stay tuned for MOXiI 2 - list is too long for now)

#define ROUTINE_DEBUG		0x2c1	// 705
#define ROUTINE_SUBMIT		100
#define ROUTINE_BLAME		0x2c3 	// 707
#define ROUTINE_DUMP_PROCESS	0x2c4	// 708
#define ROUTINE_RUNSTATS	0x2c5	// 709
#define ROUTINE_LOAD		0x320	// 800
#define ROUTINE_UNLOAD		0x321	// 801
#define ROUTINE_LOOKUP		0x324
#define ROUTINE_ENABLE		0x328	// 808
#define ROUTINE_DISABLE		0x329   // 809
#define ROUTINE_STATUS		0x32b   // 811

#define ROUTINE_KILL		0x32c
#define ROUTINE_VERSION		0x33c
#define ROUTINE_PRINT_CACHE	0x33c
#define ROUTINE_PRINT		0x33c	// also VERSION.., cache..
#define ROUTINE_REBOOT_USERSPACE	803 // 10.11/9.0 only
#define ROUTINE_START		0x32d	// 813
#define ROUTINE_STOP		0x32e	// 814
#define ROUTINE_LIST		0x32f	// 815
#define ROUTINE_SETENV		0x333	// 819
#define ROUTINE_GETENV		0x334  // 820
#define ROUTINE_RESOLVE_PORT		0x336
#define ROUTINE_EXAMINE		0x33a
#define ROUTINE_LIMIT		0x339	// 825
#define ROUTINE_DUMP_DOMAIN	0x33c	// 828
#define ROUTINE_ASUSER	0x344	// ...
#define ROUTINE_DUMP_STATE	0x342	// 034
#define ROUTINE_DUMPJPCATEGORY		0x345	// was 346 in iOS 9
// the input type for xpc_uuid_create should be uuid_t but CGO instists on unsigned char *
// typedef uuid_t * ptr_to_uuid_t;
typedef unsigned char * ptr_to_uuid_t;
extern const ptr_to_uuid_t ptr_to_uuid(void *p);

#endif