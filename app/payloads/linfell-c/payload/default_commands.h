

#ifndef DEFAULT_COMMANDS_H_
#define DEFAULT_COMMANDS_H_

#include <unistd.h>
#include <stdio.h>
#include <dlfcn.h>
#include "cJSON.h"
#include "errors.h"
#include "utils.h"
#include "base64.h"

#define READ_FD  0
#define WRITE_FD 1
#define PARENT_WRITE_PIPE  0
#define PARENT_READ_PIPE   1
#define PARENT_READ_FD  ( pipes[PARENT_READ_PIPE][READ_FD]   )
#define PARENT_WRITE_FD ( pipes[PARENT_WRITE_PIPE][WRITE_FD] )
#define CHILD_READ_FD   ( pipes[PARENT_WRITE_PIPE][READ_FD]  )
#define CHILD_WRITE_FD  ( pipes[PARENT_READ_PIPE][WRITE_FD]  )

COMMAND_HEADERS_HERE

#endif /* DEFAULT_H_ */
