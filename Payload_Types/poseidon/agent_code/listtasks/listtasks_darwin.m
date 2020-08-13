#import <Foundation/Foundation.h>
#include "listtasks_darwin.h"

char* listtasks() {
    @try {
        host_t    myhost = mach_host_self();
        host_t    host_priv;
        mach_port_t    psDefault;
        mach_port_t    psDefault_control;
        task_array_t    tasks;
        mach_msg_type_number_t numTasks;
        int i;
        thread_array_t     threads;
        thread_info_data_t    tInfo;
        kern_return_t kr;
        host_get_host_priv_port(mach_host_self(), &host_priv);
        kr = processor_set_default(host_priv, &psDefault);
        processor_set_name_array_t    *psets = malloc(1024);
        mach_msg_type_number_t      psetCount;
        kr = host_processor_sets(host_priv, psets, &psetCount);
        kr = host_processor_set_priv(host_priv, psDefault, &psDefault_control);

        if (kr != KERN_SUCCESS) {
            return [NSString stringWithFormat:@"%x", kr];
        }

        numTasks=1000;
        kr = processor_set_tasks(psDefault_control, &tasks, &numTasks);
        NSMutableDictionary *taskList = [@{} mutableCopy];

        for (i = 0; i < numTasks; i++) {
            char name[128];
            int pid;
            pid_for_task(tasks[i], &pid);
            int rc = proc_name(pid, name, 128);
            
            [taskList setObject:[NSNumber numberWithInt:pid] forKey:[NSString stringWithUTF8String:name]];
        }
        
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:taskList options:NSJSONWritingPrettyPrinted error:nil];
        NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];

        return [jsonString UTF8String];
    } @catch (NSException *exception) {
        return [[exception reason] UTF8String];
    }
}