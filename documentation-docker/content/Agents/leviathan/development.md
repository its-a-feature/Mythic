+++
title = "Development"
chapter = false
weight = 20
pre = "<b>3. </b>"
+++

## Development Environment

The chrome extension code can be modified in any text editor or IDE since it's just plaintext JavaScript.

## Adding Commands

New commands should be added to `Payload_Types/leviathan/agent_code/commands/` directory. Please use the following template:

```
exports.command = function(task) {
    try {
        // Your command code here
    } catch (error) {
        // Exception handling
        let response = {"task_id":task.id, "user_output":error.toString(), "completed": true, "status":"error"};
        let outer_response = {"action":"post_response", "responses":[response], "delegates":[]};
        let enc = JSON.stringify(outer_response);
        let final = apfell.apfellid + enc;
        let msg = btoa(unescape(encodeURIComponent(final)));
        out.push(msg);
    }
};
COMMAND_ENDS_HERE
```
- The `out` variable is an array of json messages that will be sent to the chrome server.
- The `task` variable is a json blob that represents a new task from mythic. For additional information, please review the documentation here: https://docs.apfell.net/customizing/c2-related-development/c2-profile-code/agent-side-coding/action_get_tasking.

## Adding C2 Profiles

The code for c2 profiles is saved in `Payload_Types/leviahtan/agent_code/c2/`. Please use the `chrome-server` profile as an example.
