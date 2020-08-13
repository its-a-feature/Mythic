+++
title = "curl"
chapter = false
weight = 103
hidden = false
+++

## Summary
Execute a single web request.

- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### url

- Description: URL to request.  
- Required Value: True  
- Default Value: https://www.google.com  

#### method

- Description: Type of request  
- Required Value: True  
- Default Value: None  

#### headers

- Description: base64 encoded json with headers.  
- Required Value: False  
- Default Value: None

#### body

- Description: base64 encoded body.
- Required Value: False
- Default Value: None

## Usage

```
curl {  "url": "https://www.google.com",  "method": "GET",  "headers": "",  "body": "" }
```


## Detailed Summary

This command uses the Golang http.Client to perform a GET or POST request with optional arguments for request headers and body. The header and body arguments should be base64 encoded json blobs. For the headers argument, each key should map to a standard HTTP header. 