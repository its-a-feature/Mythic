

#ifndef ERRORS_H_
#define ERRORS_H_

/* success */
#define SUCCESS 0
/* comms errors */
#define ERR_WRITING_TO_SOCKET 100
#define ERR_DATA_SIZE 102
//these next errors need to be negative to help determine valid socket ids
#define ERR_CONNECTING -103
#define ERR_OPENING_SOCKET -104
#define ERR_NO_IP_OR_HOSTNAME -105
/* utility errors */
#define ERR_CHAR_NOT_FOUND -1
#define ERR_MUTEX_INIT 201
#define ERR_MALLOC_SIZE 202
#define ERR_READING_FROM_FD 203
#define ERR_BUF_SIZE 204
#define ERR_READING_FROM_FILE 205
/* default module errors */
#define ERR_FORK_FAILED 301
/* base64 errors */
#define ERR_CREATE_TMP_FILE 302
#define ERR_DECODE_FILE 303
#define ERR_ENCODE_FILE 304
#define ERR_DELETE_TMP_FILE 305
#define ERR_OPEN_FILE 306
/* networking module errors*/
#define ERR_LOAD_LIBRARY 401
#define ERR_CREATE_THREAD 402
#endif /* ERRORS_H_ */
