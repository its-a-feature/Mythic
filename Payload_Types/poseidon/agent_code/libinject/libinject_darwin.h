#include <dlfcn.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <mach/mach.h>
#include <mach/error.h>
#include <errno.h>
#include <stdlib.h>
#include <sys/sysctl.h>
#include <dlfcn.h>
#include <sys/mman.h>
#include <libproc.h>
#include <sys/stat.h>
#include <pthread.h>
#include <mach/mach_vm.h>


extern int inject(pid_t pid, char *lib);