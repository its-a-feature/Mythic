+++
title = "OPSEC"
chapter = false
weight = 10
pre = "<b>1. </b>"
+++

## Considerations

- The agent is single-threaded. While most times this won't be an issue (other than only being able to run one command at a time), this comes into play for the `shell` and `shell_elevated` commands since they spawn a shell command and _wait for the program to finish_. So, if you run something like `shell sudo whoami` and sudo prompts for the password, your agent will never come back because it's waiting for that input.


### Process Execution

- The `shell` command spawns `/bin/sh -c [command]` which is subject to command-line logging. 
- The `shell_elevated` command spawns a series of trampoline processes to elevate your context before finally spawning the `/bin/sh -c [command]` 
- The `add_user` command spawns _many_ instances of `dscl`

### Potential Popups

The following commands can only use AppleEvents or have the option to use Apple Events which on Mojave+ (10.14+) can generate popups:
- `chrome_bookmarks` - reaches out to `Chrome`
- `chrome_js` reaches out to `Chrome`
- `chrome_tabs` reaches out to `Chrome`
- `current_user`  has an option to use AppleEvents or API calls
- `iTerm` reaches out to `iTerm`
- `screenshot` can cause popups in 10.15+
- `ls` can cause popups in 10.15+ based on the folder
- `security_info` reaches out to `System Events`
- `terminals_read` reaches out to `Terminal.app`
- `terminals_send` reaches out to `Terminal.app`
