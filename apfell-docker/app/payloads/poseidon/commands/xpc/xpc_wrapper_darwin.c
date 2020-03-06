#include <dispatch/dispatch.h>
#include <Block.h>
#include "xpc_wrapper_darwin.h"
#include <stdio.h>
#include <objc/objc.h>


struct xpc_global_data {
	uint64_t	a;
	uint64_t	xpc_flags;
	mach_port_t	task_bootstrap_port;  
#ifndef _64
	uint32_t	padding;
#endif
	xpc_object_t	xpc_bootstrap_pipe; 
};

#define OS_ALLOC_ONCE_KEY_MAX	100

struct _os_alloc_once_s {
	long once;
	void *ptr;
};
extern struct _os_alloc_once_s _os_alloc_once_table[];

xpc_type_t TYPE_ERROR = XPC_TYPE_ERROR;
xpc_type_t TYPE_ARRAY = XPC_TYPE_ARRAY;
xpc_type_t TYPE_DATA = XPC_TYPE_DATA;
xpc_type_t TYPE_DICT = XPC_TYPE_DICTIONARY;
xpc_type_t TYPE_INT64 = XPC_TYPE_INT64;
xpc_type_t TYPE_STRING = XPC_TYPE_STRING;
xpc_type_t TYPE_UUID = XPC_TYPE_UUID;
xpc_type_t TYPE_BOOL = XPC_TYPE_BOOL;
xpc_type_t TYPE_DATE = XPC_TYPE_DATE;
xpc_type_t TYPE_FD = XPC_TYPE_FD;
xpc_type_t TYPE_CONNECTION = XPC_TYPE_CONNECTION;
xpc_type_t TYPE_NULL = XPC_TYPE_NULL;
xpc_type_t TYPE_SHMEM = XPC_TYPE_SHMEM;

xpc_object_t ERROR_CONNECTION_INVALID = (xpc_object_t) XPC_ERROR_CONNECTION_INVALID;
xpc_object_t ERROR_CONNECTION_INTERRUPTED = (xpc_object_t) XPC_ERROR_CONNECTION_INTERRUPTED;
xpc_object_t ERROR_CONNECTION_TERMINATED = (xpc_object_t) XPC_ERROR_TERMINATION_IMMINENT;

const ptr_to_uuid_t ptr_to_uuid(void *p) { return (ptr_to_uuid_t)p; }


xpc_object_t XpcLaunchdListServices(char *ServiceName) {

  xpc_object_t dict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_uint64(dict, "subsystem", 3);
  xpc_dictionary_set_uint64(dict, "handle",0);
  xpc_dictionary_set_uint64(dict, "routine", ROUTINE_LIST);
  xpc_dictionary_set_uint64(dict, "type",1);

  if (ServiceName)
  {
    xpc_dictionary_set_string(dict, "name", ServiceName);
  }
  else
  {
    xpc_dictionary_set_bool(dict, "legacy", 1);
  }
  
  xpc_object_t *outDict = NULL;
  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;

  int rc = xpc_pipe_routine (xpc_gd->xpc_bootstrap_pipe, dict, &outDict);
  
  if (outDict != NULL)
  {
    return outDict;
  }
  
  xpc_object_t errDict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_string(errDict, "error", "xpc_bootstrap_pipe returned a null dictionary");

  return errDict;
}

xpc_object_t XpcLaunchdServiceControl(char *ServiceName, int StartStop) {
  xpc_object_t dict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_uint64 (dict, "subsystem", 3);               
  xpc_dictionary_set_uint64(dict, "type",1);                     
  xpc_dictionary_set_uint64(dict, "handle",0); 		  
  xpc_dictionary_set_string(dict, "name", ServiceName);                     
  xpc_dictionary_set_bool(dict, "legacy", 1);                       
  xpc_dictionary_set_uint64(dict, "routine", StartStop ? ROUTINE_START : ROUTINE_STOP);     

  xpc_object_t	*outDict = NULL;
  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;

  int rc = xpc_pipe_routine (xpc_gd->xpc_bootstrap_pipe, dict, &outDict);

  if (outDict != NULL)
  {
    return outDict;
  }

  xpc_object_t errDict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_string(errDict, "error", "xpc_bootstrap_pipe returned a null dictionary");

  return errDict;
}

xpc_object_t XpcLaunchdSubmitJob(char *Program, char *ServiceName, int KeepAlive) {
  xpc_object_t dict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_object_t request = xpc_dictionary_create(NULL, NULL, 0);
  xpc_object_t submitJob = xpc_dictionary_create(NULL, NULL, 0);

  xpc_dictionary_set_bool(submitJob, "KeepAlive", KeepAlive);
  xpc_dictionary_set_string (submitJob, "Program", Program);
  xpc_dictionary_set_string (submitJob, "Label", ServiceName);

  xpc_object_t programArguments = xpc_array_create(NULL, 0);
  xpc_dictionary_set_value(submitJob, "ProgramArguments", programArguments);

  xpc_dictionary_set_value (request, "SubmitJob", submitJob);
  xpc_dictionary_set_value (dict, "request", request);
  xpc_dictionary_set_uint64 (dict, "subsystem", 7);              
  xpc_dictionary_set_uint64(dict, "type",7);                      
  xpc_dictionary_set_uint64(dict, "handle",0); 		  
  xpc_dictionary_set_uint64(dict, "routine", ROUTINE_SUBMIT);      

  xpc_object_t	*outDict = NULL;

  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;

  int rc = xpc_pipe_routine(xpc_gd->xpc_bootstrap_pipe, dict, &outDict);
   
  if (outDict != NULL)
  {
    return outDict;
  }



  xpc_object_t errDict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_string(errDict, "error", "xpc_bootstrap_pipe returned a null dictionary");

  return errDict;
}

xpc_object_t XpcLaunchdGetServiceStatus(char *ServiceName) {
  xpc_object_t dict = xpc_dictionary_create(NULL, NULL,0);
  xpc_dictionary_set_uint64 (dict, "subsystem", 3);               
  xpc_dictionary_set_uint64(dict, "type",1);                     
  xpc_dictionary_set_uint64(dict, "handle",0); 		   
  xpc_dictionary_set_uint64(dict, "routine", ROUTINE_STATUS) ; 
  xpc_dictionary_set_string (dict,"name", ServiceName);

  xpc_object_t	*outDict = NULL;
  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;

  int rc = xpc_pipe_routine (xpc_gd->xpc_bootstrap_pipe, dict, &outDict);
   
  if (outDict != NULL)
  {
    return outDict;
  }


  // if we get here there was a problem
  xpc_object_t errDict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_string(errDict, "error", "xpc_bootstrap_pipe returned a null dictionary");

  return errDict;
}

char* XpcLaunchdGetProcInfo(unsigned long pid) {
  char *pointer;
  int ret;
  pointer = tmpnam(NULL);
  int fd = open(pointer, O_WRONLY | O_CREAT |  O_TRUNC,
    S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH);
  //int fd = fileno(tmp);
  xpc_object_t dict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_uint64(dict, "routine",ROUTINE_DUMP_PROCESS); 
  xpc_dictionary_set_uint64 (dict, "subsystem", 2); 
  xpc_dictionary_set_fd(dict, "fd",fd);                             
  xpc_dictionary_set_int64(dict, "pid",pid);                       
  xpc_object_t	*outDict = NULL;

  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;

  int rc = xpc_pipe_routine (xpc_gd->xpc_bootstrap_pipe, dict, &outDict);
  //close(fd);
  return pointer;
}

xpc_object_t XpcLaunchdLoadPlist(char *Plist, int Legacy) {
  xpc_object_t dict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_object_t s = xpc_string_create(Plist);
  xpc_object_t paths = xpc_array_create(&s, 1);
  xpc_dictionary_set_value(dict, "paths", paths);

  xpc_dictionary_set_uint64 (dict, "subsystem", 3);              
  xpc_dictionary_set_bool(dict, "enable", true);
	if (Legacy) xpc_dictionary_set_bool(dict, "legacy", true);
  xpc_dictionary_set_bool(dict, "legacy-load", true);
  xpc_dictionary_set_uint64(dict, "type",7);                     
  xpc_dictionary_set_uint64(dict, "handle",0); 		   
  xpc_dictionary_set_string(dict, "session", "Aqua");
  xpc_dictionary_set_uint64(dict, "routine", ROUTINE_LOAD);

  xpc_object_t	*outDict = NULL;
  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;


  int rc = xpc_pipe_routine(xpc_gd->xpc_bootstrap_pipe, dict, &outDict);
  if (rc == 0) {
    int err = xpc_dictionary_get_int64 (outDict, "error");
    if (err) printf("Error:  %d - %s\n", err, xpc_strerror(err));
    return outDict;
  }

  if (outDict != NULL)
  {
    return outDict;
  }


 
  xpc_object_t errDict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_string(errDict, "error", "xpc_bootstrap_pipe returned a null dictionary");

  return errDict;
}

xpc_object_t XpcLaunchdUnloadPlist(char *Plist) {
  xpc_object_t dict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_object_t s = xpc_string_create(Plist);
  xpc_object_t paths = xpc_array_create(&s, 1);
  xpc_dictionary_set_value (dict, "paths", paths);

  xpc_dictionary_set_uint64 (dict, "subsystem", 3);             
  xpc_dictionary_set_bool(dict, "disable", true);
  xpc_dictionary_set_bool(dict, "legacy-load", true);
  xpc_dictionary_set_bool(dict, "legacy", true);
  xpc_dictionary_set_uint64(dict, "type",7);                      
  xpc_dictionary_set_uint64(dict, "handle",0); 		   
  xpc_dictionary_set_string(dict, "session", "Aqua");
  xpc_dictionary_set_uint64(dict, "routine", ROUTINE_UNLOAD);


  xpc_object_t	*outDict = NULL;
  struct xpc_global_data  *xpc_gd  = (struct xpc_global_data *)  _os_alloc_once_table[1].ptr;


  int rc = xpc_pipe_routine (xpc_gd->xpc_bootstrap_pipe, dict, &outDict);
  if (rc == 0) {
    int err = xpc_dictionary_get_int64 (outDict, "error");
    if (err) printf("Error:  %d - %s\n", err, xpc_strerror(err));
    return outDict;
  }

  if (outDict != NULL)
  {
    return outDict;
  }


 
  xpc_object_t errDict = xpc_dictionary_create(NULL, NULL, 0);
  xpc_dictionary_set_string(errDict, "error", "xpc_bootstrap_pipe returned a null dictionary");

  return errDict;
}


xpc_connection_t XpcConnect(char *service, uintptr_t ctx, int privileged) {
    dispatch_queue_t queue = dispatch_queue_create(service, 0);
    xpc_connection_t conn = xpc_connection_create_mach_service(service, queue, privileged ? XPC_CONNECTION_MACH_SERVICE_PRIVILEGED: NULL);

    

    xpc_connection_set_event_handler(conn,
        Block_copy(^(xpc_object_t event) {
            handleXpcEvent(event, ctx); 
        })
    );

    xpc_connection_resume(conn);
    return conn;
}

void XpcSendMessage(xpc_connection_t conn, xpc_object_t message, bool release, bool reportDelivery) {
    xpc_connection_send_message(conn,  message);
    xpc_connection_send_barrier(conn, ^{
        
        if (reportDelivery) { 
            puts("message delivered");
        }
    });
    if (release) {
        xpc_release(message);
    }
}

void XpcArrayApply(uintptr_t v, xpc_object_t arr) {
  xpc_array_apply(arr, ^bool(size_t index, xpc_object_t value) {
    arraySet(v, index, value);
    return true;
  });
}

void XpcDictApply(uintptr_t v, xpc_object_t dict) {
  xpc_dictionary_apply(dict, ^bool(const char *key, xpc_object_t value) {
    dictSet(v, (char *)key, value);
    return true;
  });
}

void XpcUUIDGetBytes(void *v, xpc_object_t uuid) {
   const uint8_t *src = xpc_uuid_get_bytes(uuid);
   uint8_t *dest = (uint8_t *)v;

   for (int i=0; i < sizeof(uuid_t); i++) {
     dest[i] = src[i];
   }
}