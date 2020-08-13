+++
title = "OPSEC"
chapter = false
weight = 10
pre = "<b>1. </b>"
+++

## Considerations
The leviathan agent does not utilize AES encryption for C2 communications.

### Post-Exploitation Jobs
All post-exploitation tasks are executed in an asynchronous manner.

### Connections
There's one held-open connection via WebSockets, then all tasking occurs within that connection.