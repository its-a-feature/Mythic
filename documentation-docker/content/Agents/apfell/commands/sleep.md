+++
title = "sleep"
chapter = false
weight = 100
hidden = false
+++

## Summary

Modify the time between callbacks in seconds. 
- Needs Admin: False  
- Version: 1  
- Author: @its_a_feature_  

### Arguments

#### jitter

- Description: Percentage of C2's interval to use as jitter   
- Required Value: False  
- Default Value: None  

#### interval

- Description: Number of seconds between checkins   
- Required Value: False  
- Default Value: None  

## Usage
### Without Popup

```
sleep [interval] [jitter]
```

## MITRE ATT&CK Mapping

- T1029  
## Detailed Summary
Internally modifies the sleep interval and sleep jitter percentages when doing callbacks:
```JavaScript
get_random_int(max) {
    return Math.floor(Math.random() * Math.floor(max + 1));
}
gen_sleep_time(){
  //generate a time that's this.interval += (this.interval * 1/this.jitter)
  if(this.jitter < 1){return this.interval;}
  let plus_min = this.get_random_int(1);
  if(plus_min === 1){
      return this.interval + (this.interval * (this.get_random_int(this.jitter)/100));
  }else{
      return this.interval - (this.interval * (this.get_random_int(this.jitter)/100));
  }
}
```
