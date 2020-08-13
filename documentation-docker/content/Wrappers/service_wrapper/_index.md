+++
title = "service_wrapper"
chapter = false
weight = 5
+++

## Summary

The `service_wrapper` payload creates a C# Service Executable for .NET 3.5 or 4.0. It takes in another agent, specifically an `atlas` agent that has been created with an output type of `Raw`. The build process checks if there's an MZ header and will error if there is.
The Service embeds the ShellCode as an embedded resource and generates a simple service executable. The service does not automatically do any injection or process migration, it simply launches the raw shellcode as a thread within the service.

### Highlighted wrapper Features
- Creates a service control manager compliant C# service

## Authors
- @its_a_feature_
