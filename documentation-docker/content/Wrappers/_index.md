+++
title = "Wrappers"
chapter = false
weight = 5
alwaysopen = true
+++

## Wrapper Documentation

Wrappers are a specific kind of payload where their entire goal is to somehow embed or stage an agent - wrappers don't have commands or c2 profiles. 

The goal of a wrapper is to abstract out payload creation components that aren't necessarily agent specific. For example, the `service_wrapper` wrapper simply takes in shellcode and creates a C# Service executable. There's no reason for every Windows agent to _also_ support the creation of a service when that's something that can be abstracted away. More wrappers will be added going forward to support other common types of payloads.

Wrapper payloads will include the following sections:

### Overview

This is a high level overview of the wrapper, interesting features to note about it, authors, and special thanks.

### OPSEC

This is an overview of operational security considerations related to the wrapper payload.

### Development

This section goes into the ideal development environment and information about how to modify the resulting payload.
