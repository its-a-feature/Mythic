+++
title = "loadassembly"
chapter = false
weight = 100
hidden = false
+++

## Summary

Load an arbitrary .NET assembly in the agent's process.
- Needs Admin: False  
- Version: 1  
- Author:   

### Arguments

#### assembly_id

- Description: File to be transferred to agent
- Required Value: False  
- Default Value: None  

## Usage

```
loadassembly
```


## Detailed Summary
This command will transfer a arbitary .NET assembly to an agent and reflectively load it via `System.Reflection.Assembly.Load`. The assembly name is tracked to enable future execution of the assembly without needing to reload it again. Execution of loaded assemblies can be achieved using the `runassembly` command.
