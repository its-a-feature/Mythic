+++
title = "OPSEC"
chapter = false
weight = 10
pre = "<b>1. </b>"
+++

## Considerations
`atlas` was designed to be as OPSEC friendly as possible, which in turn subjects the agnet to limited functionality. Currently, all commands for `atlas` use direct .NET methods or P/Invoke signatures where needed, while attempting to not require any third-party dependencies.

To prevent defensive telemetry into the operations of an `atlas` agent, two bypasses are included to attempt to limit this visibility. 

- The first is an AMSI bypass to allow safer loading and execution of .NET assemblies. This technique is describe in [this post](https://rastamouse.me/blog/asb-bypass-pt3/) by [@_rastamouse](https://twitter.com/_rastamouse) and is part of the [SharpSploit](https://github.com/cobbr/SharpSploit/blob/master/SharpSploit/Evasion/Amsi.cs) project.

- The second method is a bypass to the `ETWEventWrite` function outlined by [@_xpn_](https://twitter.com/_xpn_) [here](https://www.mdsec.co.uk/2020/03/hiding-your-net-etw/).

### Post-Exploitation Jobs
All post-expoitation jobs ran by `atlas` are executed within the agent's process memory space. This limits agent exposure to defensive telemetry by reducing interactions with remote processes. This comes with a risk of jobs crashing an agent's process. To combat this risk, `atlas` uses a multi-thread approach with error handling to minimize the impact of a crashed job to the agent's main executing thread.

### Remote Process Injection
There is no built in process injection technique available for `atlas`. However, with the ability to load and execute arbitary assemblies, there is room to create your own .NET assembly to execute any form of process injection.

### Process Execution
There is currently no built in process execution method available in `atlas`. This was to reduce the urge for operators to immediatly execute commands without need. Process execution can be achieved through the use of a custom .NET assembly loaded and executed through `atlas`.