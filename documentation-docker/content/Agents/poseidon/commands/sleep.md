+++
title = "sleep"
chapter = false
weight = 126
hidden = false
+++

## Summary
Update the sleep interval and jitter for the agent.

  
- Needs Admin: False  
- Version: 1  
- Author: @xorrior  

### Arguments

#### jitter

- Description: Jitter percentage.  
- Required Value: False  
- Default Value: -1  

#### interval

- Description: Sleep time in seconds  
- Required Value: False  
- Default Value: -1  

## Usage
### Without the popup
```
sleep 10
sleep 10 25
```
The first example sets only the sleep interval and leaves the jitter percentage the same. The second option sets both the sleep interval and jitter percentage. If a value is left as -1, then it won't be updated. So, to update _just_ the jitter percentage, you could run:
```
sleep -1 50
```


## Detailed Summary

Change the agents sleep interval.