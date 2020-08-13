+++
title = "dynamicHTTP"
chapter = false
weight = 102
+++

## Summary
The `apfell` agent uses a series of GET and POST web requests. 
{{% notice warning %}}
However, the `apfell` agent cannot currently GET/SET Cookie values due to a limitation with JXA in casting the NSURLConnection object to an HTTPConnection object.
{{% /notice %}}
### Profile Option Deviations
