+++
title = "Development"
chapter = false
weight = 20
pre = "<b>3. </b>"
+++

## Development Environment

For command development, please use golang v1.12+ .

## Adding Commands

- Create a new folder with the name of the command in `Payload_Types/poseidon/agent_code/[COMMAND]`.
- Inside the folder create a single go file called `command.go`. If the implementation of the command is compatible with both macOS and Linux, only a single go file should be necessary. If the implementation is different, create two additional files. All files that are for the darwin/macOS implementation should have the nomenclature `command_darwin.go` and `command_linux.go` for Linux. There are a minimum set of imports that are required for any command.
```
import (
	"pkg/utils/structs"
	"pkg/profiles"
	"encoding/json"
	"sync"
)
```
- The results/output for a command should be saved to a `Response` struct. The struct should be serialized to bytes with `json.Marshal` and then saved to the `profiles.TaskResponses` global variable. Please refer to the cat command in `Payload_Types/poseidon/agent_code/cat/cat.go` as an example.


## Adding C2 Profiles

- Where code for editing/adding c2 profiles is located
- Add C2 profile code to the `Payload_Types/poseidon/c2_profiles/` folder.
- Your C2 profile should conform to the Profile interface defined in `Payload_Types/poseidon/agent_code/pkg/profiles/profile.go`
- Create a struct to hold C2 configuration in `Payload_Types/poseidon/agent_code/pkg/utils/structs/definitions.go`
Example config
```
type Defaultconfig struct {
    KEYX       string   `json:"keyx"`
    Key     string   `json:"key"`
    BaseURL    string   `json:"baseurl"`
    UserAgent  string   `json:"useragent"`
    Sleep      int   `json:"sleep"`
    HostHeader string   `json:"hostheader"`
    Jitter     int      `json:"jitter"`
}
```

