+++
title = "dynamicHTTP"
chapter = false
weight = 5
+++

## Overview
This C2 profile consists of HTTP requests from an agent to the C2 profile container, where messages are then forwarded to Mythic's API. The C2 Profile container acts as a proxy between agents and the Mythic server itself.

The Profile is not proxy aware by default - this is a component left as an exercise for the individual agents. 

This C2 profile offers extreme customization of the network traffic via a JSON configuration file, including randomized components, custom encoding, and modification of where the agent's message should go (URL, query parameter, cookie, body).
You can even customize your profile to use _only_ GET messages or _only_ POST messages by leaving the `AgentMessage` section as an empty array (`[]`) for that method.

### C2 Workflow
{{<mermaid>}}
sequenceDiagram
    participant M as Mythic
    participant H as dynamicHTTP
    participant A as Agent
    A ->>+ H: GET/POST
    Note over H: Undo Agent Mods
    H ->>+ M: forward request to Mythic
    M -->>- H: reply with data
    Note over H: Make Agent Mods
    H -->>- A: reply with data
{{< /mermaid >}}

Legend:

- Solid line is a new connection
- Dotted line is a message within that connection

## Configuration Options
The profile reads a `config.json` file for a set of instances of `Sanic` webservers to stand up (`443` by default) and redirects the content. There is a very thorough writeup on the profile located with the [public documentation](https://docs.apfell.net/v/version-1.5/c2-profiles/dynamichttp).

There are two pieces to the configuration and they need to match up for everything to go smoothly. The server has an array of `instances` that define how communication happens, including:
- Where the message is located in the HTTP request
  - this can be the Body, a query parameter, a cookie value, or even in the URL itself
- What functions need to take place to transform the message value back to the base message that Mythic needs
  - For example, the message could have been split in two, had random values added in, and encoded in a custom way
- What server headers should be used in the response to the message
- What port the server should listen on
- What should happen if a message is received, but doesn't match the above pattern?
  - This allows you to get creative and redirect to other sites, return the content of other sites, read html pages from disk and return them, or send custom error messages

The Agent needs to have a matching set of configuration parameters so that the manipulation of agent messages and HTTP requests is consistent.

If you want to use SSL within this container specifically, then you can put your key and cert in the `C2_Profiles/dynamicHTTP/c2_code` folder and update the `key_path` and `cert_path` variables to have the `names` of those files.
You should get a notification when the server starts with information about the configuration:

```
Messages will disappear when this dialog is closed.
Received Message:
Started with pid: 15...
Output: Opening config and starting instances...
Debugging output is enabled. This might be a performance it, but gives more context
not using SSL for port 443
[2020-07-30 16:46:50 +0000] [15] [INFO] Goin' Fast @ http://0.0.0.0:443
```

A note about debugging:
- With `debug` set to `true`, you'll be able to `view stdout/stderr` from within the UI for the container, but it's not recommended to always have this on (especially if you start using something like SOCKS). There can be a lot of traffic and a lot of debugging information captured here which can be both a performance and memory bottleneck depending on your environment and operational timelines.
- It's recommended to have it on initially to help troubleshoot payload connectivity and configuration issues, but then to set it to `false` for actual operations


Available functions within the profile:
- base64
  - base64 encodes the input
- prepend
  - prepends a string to the input
- append
  - appends a string to the input
- random_mixed
  - generates a random mixed string of a certain length from a-zA-Z0-9 and appends it
- random_number
  - generates a random number of a certain length and appends it
- random_alpha
  - generates a random string of a certain length from a-zA-Z and appends it
- choose_random
  - randomly chooses one option from a given array of options and appends it
  
### Linting

Because there is a lot more to this profile than something like the `HTTP` profile, there is a linting program to help make sure your server and agent configs line up. A linting program is simply a small program that checks for syntax and configuration issues. In `C2_Profiles/dynamicHTTP/c2_code` you'll find the `config_linter.py` file. 

To use this, cd into the `C2_Profiles/dynamicHTTP/c2_code` folder. Save a copy of the config you want to supply to your agent (for example: `agent_config.json`). Run `./config_linter.py agent_config.json`. This program will first parse the `config.json` file in the same directory to make sure it matches the server side of a config, then it'll read the `agent_config.json` that you specified to make sure it's formatted correctly, and finally it'll make sure that there's a matching server component for the agent config supplied. An example of this process is shown below:

```Bash
its-a-feature@ubuntu:~/Desktop/Apfell/C2_Profiles/dynamicHTTP/c2_code$ python3 config_linter.py agent_config.json 
[*] Checking server config for layout structure
[+] Server config layout structure is good
[*] Checking agent config for layout structure
[+] Agent config layout structure is good
[*] Looking into GET AgentMessages
[*] Current URLs: ['http://192.168.205.151:9000']
	Current URI: /<test:string>
[*] Found 'message' keyword in QueryParameter q
[*] Now checking server config for matching section
[*] Found matching URLs and URI, checking rest of AgentMessage
[+] FOUND MATCH
[*] Looking into POST AgentMessages
[*] Current URLs: ['http://192.168.205.151:9000']
	Current URI: /download.php
[*] Did not find message keyword anywhere, assuming it to be the Body of the message
[*] Now checking server config for matching section
[*] Found matching URLs and URI, checking rest of AgentMessage
[*] Checking for matching Body messages
[+] FOUND MATCH

```
  
### Profile Options
#### Base64 of a 32-byte AES Key
Base64 value of the AES pre-shared key to use for communication with the agent. This will be auto-populated with a static key for the operation, but you can also replace this with the base64 of any 32 bytes you want. If you don't want to use encryption here, blank out this value.

#### Agent Config
This is the JSON agent config that would go into the agent. 

## OPSEC

This profile offers a lot of customizability for your traffic to help better blend in and avoid beaconing indicators. However, you still need to consider the frequency of callbacks and the kinds of data you're sending (ex: sending a GET request with data in the body might look weird).

## Development

All of the code for the server is Python3 using `Sanic` and located in `C2_Profiles/dynamicHTTP/c2_code/server`. It loops through the `instances` in the `config.json` file and stands up those individual web servers.

To add a new `function`, you need to do only a couple of things:
- Determine what the function does
  - this includes what kind of parameters it needs
- Determine how to _reverse_ the function
  - this includes what kind of parameters it needs
- in `C2_Profiles/dynamicHTTP/c2_code/server` you need to add two functions:
```Python
async def function_name(*args):
    return "your changed thing here"

async def r_function_name(*args):
    return "reverse the changes you made with function_name here"
```
  - every function will have the current working value as `args[0]` and any additional args that the function needs will be `args[1:]`
- In the agents that support this new function, you need to make sure to do a similar thing (agent specific)
  - This allows agents to actually implement the functionality you just added in
  
# Sample Server Configuration

```JSON
{
  "instances": [
  {
    "GET": {
    "ServerBody": [
      {
        "function": "base64",
        "parameters": []
      },
      {
        "function": "prepend",
        "parameters": ["!function(e,t){\"use strict\";\"object\"==typeof module&&\"object\"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error(\"jQuery requires a window with a document\");return t(e)}:t(e)}(\"undefined\"!=typeof window?window:this,function(e,t){\"use strict\";var n=[],r=e.document,i=Object.getPrototypeOf,o=n.slice,a=n.concat,s=n.push,u=n.indexOf,l={},c=l.toString,f=l.hasOwnProperty,p=f.toString,d=p.call(Object),h={},g=function e(t){return\"function\"==typeof t&&\"number\"!=typeof t.nodeType},y=function e(t){return null!=t&&t===t.window},v={type:!0,src:!0,noModule:!0};function m(e,t,n){var i,o=(t=t||r).createElement(\"script\");if(o.text=e,n)for(i in v)n[i]&&(o[i]=n[i]);t.head.appendChild(o).parentNode.removeChild(o)}function x(e){return null==e?e+\"\":\"object\"==typeof e||\"function\"==typeof e?l[c.call(e)]||\"object\":typeof e}var b=\"3.3.1\",w=function(e,t){return new w.fn.init(e,t)},T=/^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g;w.fn=w.prototype={jquery:\"3.3.1\",constructor:w,length:0,toArray:function(){return o.call(this)},get:function(e){return null==e?o.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){var t=w.merge(this.constructor(),e);return t.prevObject=this,t},each:function(e){return w.each(this,e)},map:function(e){return this.pushStack(w.map(this,function(t,n){return e.call(t,n,t)}))},slice:function(){return this.pushStack(o.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(n>=0&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:s,sort:n.sort,splice:n.splice},w.extend=w.fn.extend=function(){var e,t,n,r,i,o,a=arguments[0]||{},s=1,u=arguments.length,l=!1;for(\"boolean\"==typeof a&&(l=a,a=arguments[s]||{},s++),\"object\"==typeof a||g(a)||(a={}),s===u&&(a=this,s--);s<u;s++)if(null!=(e=arguments[s]))for(t in e)n=a[t],a!==(r=e[t])&&(l&&r&&(w.isPlainObject(r)||(i=Array.isArray(r)))?(i?(i=!1,o=n&&Array.isArray(n)?n:[]):o=n&&w.isPlainObject(n)?n:{},a[t]=w.extend(l,o,r)):void 0!==r&&(a[t]=r));return a},w.extend({expando:\"jQuery\"+(\"3.3.1\"+Math.random()).replace(/\\D/g,\"\"),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isPlainObject:function(e){var t,n;return!(!e||\"[object Object]\"!==c.call(e))&&(!(t=i(e))||\"function\"==typeof(n=f.call(t,\"constructor\")&&t.constructor)&&p.call(n)===d)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},globalEval:function(e){m(e)},each:function(e,t){var n,r=0;if(C(e)){for(n=e.length;r<n;r++)if(!1===t.call(e[r],r,e[r]))break}else for(r in e)if(!1===t.call(e[r],r,e[r]))break;return e},trim:function(e){return null==e?\"\":(e+\"\").replace(T,\"\")},makeArray:function(e,t){var n=t||[];return null!=e&&(C(Object(e))?w.merge(n,\"string\"==typeof e?[e]:e):s.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:u.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r,i=[],o=0,a=e.length,s=!n;o<a;o++)(r=!t(e[o],o))!==s&&i.push(e[o]);return i},map:function(e,t,n){var r,i,o=0,s=[];if(C(e))for(r=e.length;o<r;o++)null!=(i=t(e[o],o,n))&&s.push(i);else for(o in e)null!=(i=t(e[o],o,n))&&s.push(i);return a.apply([],s)},guid:1,support:h}),\"function\"==typeof Symbol&&(w.fn[Symbol.iterator]=n[Symbol.iterator]),w.each(\"Boolean Number String Function Array Date RegExp Object Error Symbol\".split(\" \"),function(e,t){l[\"[object \"+t+\"]\"]=t.toLowerCase()});function C(e){var t=!!e&&\"length\"in e&&e.length,n=x(e);return!g(e)&&!y(e)&&(\"array\"===n||0===t||\"number\"==typeof t&&t>0&&t-1 in e)}var E=function(e){var t,n,r,i,o,a,s,u,l,c,f,p,d,h,g,y,v,m,x,b=\"sizzle\"+1*new Date,w=e.document,T=0,C=0,E=ae(),k=ae(),S=ae(),D=function(e,t){return e===t&&(f=!0),0},N={}.hasOwnProperty,A=[],j=A.pop,q=A.push,L=A.push,H=A.slice,O=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},P=\"\r"]
      },
      {
        "function": "prepend",
        "parameters": ["/*! jQuery v3.3.1 | (c) JS Foundation and other contributors | jquery.org/license */"]
      },
      {
        "function": "append",
        "parameters": ["\".(o=t.documentElement,Math.max(t.body[\"scroll\"+e],o[\"scroll\"+e],t.body[\"offset\"+e],o[\"offset\"+e],o[\"client\"+e])):void 0===i?w.css(t,n,s):w.style(t,n,i,s)},t,a?i:void 0,a)}})}),w.each(\"blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu\".split(\" \"),function(e,t){w.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),w.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),w.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,\"**\"):this.off(t,e||\"**\",n)}}),w.proxy=function(e,t){var n,r,i;if(\"string\"==typeof t&&(n=e[t],t=e,e=n),g(e))return r=o.call(arguments,2),i=function(){return e.apply(t||this,r.concat(o.call(arguments)))},i.guid=e.guid=e.guid||w.guid++,i},w.holdReady=function(e){e?w.readyWait++:w.ready(!0)},w.isArray=Array.isArray,w.parseJSON=JSON.parse,w.nodeName=N,w.isFunction=g,w.isWindow=y,w.camelCase=G,w.type=x,w.now=Date.now,w.isNumeric=function(e){var t=w.type(e);return(\"number\"===t||\"string\"===t)&&!isNaN(e-parseFloat(e))},\"function\"==typeof define&&define.amd&&define(\"jquery\",[],function(){return w});var Jt=e.jQuery,Kt=e.$;return w.noConflict=function(t){return e.$===w&&(e.$=Kt),t&&e.jQuery===w&&(e.jQuery=Jt),w},t||(e.jQuery=e.$=w),w});"]
      }
    ],
    "ServerHeaders": {
        "Server": "NetDNA-cache/2.2",
        "Cache-Control": "max-age=0, no-cache",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "application/javascript; charset=utf-8"
      },
    "ServerCookies": {},
    "AgentMessage": [{
      "urls": ["http://192.168.205.151:9000"],
      "uri": "/<test:string>",
      "urlFunctions": [
        {
          "name": "<test:string>",
          "value": "",
          "transforms": [
            {
              "function": "choose_random",
              "parameters": ["jquery-3.3.1.min.js","jquery-3.3.1.map"]
            }
          ]
        }
      ],
      "AgentHeaders": {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Host": "code.jquery.com",
        "Referer": "http://code.jquery.com/",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"
      },
      "QueryParameters": [
          {
            "name": "q",
            "value": "message",
            "transforms": [
            ]
          }
      ],
      "Cookies": [
         {
          "name": "__cfduid",
          "value": "",
          "transforms": [
            {
              "function": "random_alpha",
              "parameters": [30]
            },
            {
              "function": "base64",
              "parameters": []
            }
          ]
        }
      ],
      "Body": []
    }]
  },
    "POST": {
    "ServerBody": [],
    "ServerCookies": {},
    "ServerHeaders": {
          "Server": "NetDNA-cache/2.2",
          "Cache-Control": "max-age=0, no-cache",
          "Pragma": "no-cache",
          "Connection": "keep-alive",
          "Content-Type": "application/javascript; charset=utf-8"
        },
    "AgentMessage": [{
      "urls": ["http://192.168.205.151:9000"],
      "uri": "/download.php",
      "urlFunctions": [],
      "QueryParameters": [
        {
          "name": "bob2",
          "value": "justforvalidation",
          "transforms": []
        }
      ],
      "AgentHeaders": {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Host": "code.jquery.com",
        "Referer": "http://code.jquery.com/",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"
      },
      "Cookies": [
        {
          "name": "BobCookie",
          "value": "splat",
          "transforms": [
            {
              "function": "prepend",
              "parameters": [
                "splatity_"
              ]
            }
          ]
        }
      ],
      "Body": [
        {
          "function": "base64",
          "parameters": []
        },
        {
          "function": "prepend",
          "parameters": ["<html>"]
        },
          {
          "function": "append",
          "parameters": ["</html>"]
        }
      ]
    }]
  },
    "no_match": {
      "action": "return_file",
      "redirect": "http://example.com",
      "proxy_get": {
        "url": "https://www.google.com",
        "status": 200
      },
      "proxy_post": {
        "url": "https://www.example.com",
        "status": 200
      },
      "return_file": {
        "name": "fake.html",
        "status": 404
      }
    },
    "port": 443,
    "key_path": "",
    "cert_path": "",
    "debug": true
    }
  ]
}

```

# Sample Agent Configuration

```JSON
{
  "GET": {
    "ServerBody": [
      {
        "function": "base64",
        "parameters": []
      },
      {
        "function": "prepend",
        "parameters": ["!function(e,t){\"use strict\";\"object\"==typeof module&&\"object\"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error(\"jQuery requires a window with a document\");return t(e)}:t(e)}(\"undefined\"!=typeof window?window:this,function(e,t){\"use strict\";var n=[],r=e.document,i=Object.getPrototypeOf,o=n.slice,a=n.concat,s=n.push,u=n.indexOf,l={},c=l.toString,f=l.hasOwnProperty,p=f.toString,d=p.call(Object),h={},g=function e(t){return\"function\"==typeof t&&\"number\"!=typeof t.nodeType},y=function e(t){return null!=t&&t===t.window},v={type:!0,src:!0,noModule:!0};function m(e,t,n){var i,o=(t=t||r).createElement(\"script\");if(o.text=e,n)for(i in v)n[i]&&(o[i]=n[i]);t.head.appendChild(o).parentNode.removeChild(o)}function x(e){return null==e?e+\"\":\"object\"==typeof e||\"function\"==typeof e?l[c.call(e)]||\"object\":typeof e}var b=\"3.3.1\",w=function(e,t){return new w.fn.init(e,t)},T=/^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g;w.fn=w.prototype={jquery:\"3.3.1\",constructor:w,length:0,toArray:function(){return o.call(this)},get:function(e){return null==e?o.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){var t=w.merge(this.constructor(),e);return t.prevObject=this,t},each:function(e){return w.each(this,e)},map:function(e){return this.pushStack(w.map(this,function(t,n){return e.call(t,n,t)}))},slice:function(){return this.pushStack(o.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(n>=0&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:s,sort:n.sort,splice:n.splice},w.extend=w.fn.extend=function(){var e,t,n,r,i,o,a=arguments[0]||{},s=1,u=arguments.length,l=!1;for(\"boolean\"==typeof a&&(l=a,a=arguments[s]||{},s++),\"object\"==typeof a||g(a)||(a={}),s===u&&(a=this,s--);s<u;s++)if(null!=(e=arguments[s]))for(t in e)n=a[t],a!==(r=e[t])&&(l&&r&&(w.isPlainObject(r)||(i=Array.isArray(r)))?(i?(i=!1,o=n&&Array.isArray(n)?n:[]):o=n&&w.isPlainObject(n)?n:{},a[t]=w.extend(l,o,r)):void 0!==r&&(a[t]=r));return a},w.extend({expando:\"jQuery\"+(\"3.3.1\"+Math.random()).replace(/\\D/g,\"\"),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isPlainObject:function(e){var t,n;return!(!e||\"[object Object]\"!==c.call(e))&&(!(t=i(e))||\"function\"==typeof(n=f.call(t,\"constructor\")&&t.constructor)&&p.call(n)===d)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},globalEval:function(e){m(e)},each:function(e,t){var n,r=0;if(C(e)){for(n=e.length;r<n;r++)if(!1===t.call(e[r],r,e[r]))break}else for(r in e)if(!1===t.call(e[r],r,e[r]))break;return e},trim:function(e){return null==e?\"\":(e+\"\").replace(T,\"\")},makeArray:function(e,t){var n=t||[];return null!=e&&(C(Object(e))?w.merge(n,\"string\"==typeof e?[e]:e):s.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:u.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r,i=[],o=0,a=e.length,s=!n;o<a;o++)(r=!t(e[o],o))!==s&&i.push(e[o]);return i},map:function(e,t,n){var r,i,o=0,s=[];if(C(e))for(r=e.length;o<r;o++)null!=(i=t(e[o],o,n))&&s.push(i);else for(o in e)null!=(i=t(e[o],o,n))&&s.push(i);return a.apply([],s)},guid:1,support:h}),\"function\"==typeof Symbol&&(w.fn[Symbol.iterator]=n[Symbol.iterator]),w.each(\"Boolean Number String Function Array Date RegExp Object Error Symbol\".split(\" \"),function(e,t){l[\"[object \"+t+\"]\"]=t.toLowerCase()});function C(e){var t=!!e&&\"length\"in e&&e.length,n=x(e);return!g(e)&&!y(e)&&(\"array\"===n||0===t||\"number\"==typeof t&&t>0&&t-1 in e)}var E=function(e){var t,n,r,i,o,a,s,u,l,c,f,p,d,h,g,y,v,m,x,b=\"sizzle\"+1*new Date,w=e.document,T=0,C=0,E=ae(),k=ae(),S=ae(),D=function(e,t){return e===t&&(f=!0),0},N={}.hasOwnProperty,A=[],j=A.pop,q=A.push,L=A.push,H=A.slice,O=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},P=\"\r"]
      },
      {
        "function": "prepend",
        "parameters": ["/*! jQuery v3.3.1 | (c) JS Foundation and other contributors | jquery.org/license */"]
      },
      {
        "function": "append",
        "parameters": ["\".(o=t.documentElement,Math.max(t.body[\"scroll\"+e],o[\"scroll\"+e],t.body[\"offset\"+e],o[\"offset\"+e],o[\"client\"+e])):void 0===i?w.css(t,n,s):w.style(t,n,i,s)},t,a?i:void 0,a)}})}),w.each(\"blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu\".split(\" \"),function(e,t){w.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),w.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),w.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,\"**\"):this.off(t,e||\"**\",n)}}),w.proxy=function(e,t){var n,r,i;if(\"string\"==typeof t&&(n=e[t],t=e,e=n),g(e))return r=o.call(arguments,2),i=function(){return e.apply(t||this,r.concat(o.call(arguments)))},i.guid=e.guid=e.guid||w.guid++,i},w.holdReady=function(e){e?w.readyWait++:w.ready(!0)},w.isArray=Array.isArray,w.parseJSON=JSON.parse,w.nodeName=N,w.isFunction=g,w.isWindow=y,w.camelCase=G,w.type=x,w.now=Date.now,w.isNumeric=function(e){var t=w.type(e);return(\"number\"===t||\"string\"===t)&&!isNaN(e-parseFloat(e))},\"function\"==typeof define&&define.amd&&define(\"jquery\",[],function(){return w});var Jt=e.jQuery,Kt=e.$;return w.noConflict=function(t){return e.$===w&&(e.$=Kt),t&&e.jQuery===w&&(e.jQuery=Jt),w},t||(e.jQuery=e.$=w),w});"]
      }
    ],
    "ServerHeaders": {
        "Server": "NetDNA-cache/2.2",
        "Cache-Control": "max-age=0, no-cache",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "application/javascript; charset=utf-8"
      },
    "ServerCookies": {},
    "AgentMessage": [{
      "urls": ["http://192.168.205.151:9000"],
      "uri": "/<test:string>",
      "urlFunctions": [
        {
          "name": "<test:string>",
          "value": "",
          "transforms": [
            {
              "function": "choose_random",
              "parameters": ["jquery-3.3.1.min.js","jquery-3.3.1.map"]
            }
          ]
        }
      ],
      "AgentHeaders": {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Host": "code.jquery.com",
        "Referer": "http://code.jquery.com/",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"
      },
      "QueryParameters": [
          {
            "name": "q",
            "value": "message",
            "transforms": [
            ]
          }
      ],
      "Cookies": [
         {
          "name": "__cfduid",
          "value": "",
          "transforms": [
            {
              "function": "random_alpha",
              "parameters": [30]
            },
            {
              "function": "base64",
              "parameters": []
            }
          ]
        }
      ],
      "Body": []
    }]
  },
  "POST": {
    "ServerBody": [],
    "ServerCookies": {},
    "ServerHeaders": {
          "Server": "NetDNA-cache/2.2",
          "Cache-Control": "max-age=0, no-cache",
          "Pragma": "no-cache",
          "Connection": "keep-alive",
          "Content-Type": "application/javascript; charset=utf-8"
        },
    "AgentMessage": [{
      "urls": ["http://192.168.205.151:9000"],
      "uri": "/download.php",
      "urlFunctions": [],
      "QueryParameters": [
        {
          "name": "bob2",
          "value": "justforvalidation",
          "transforms": []
        }
      ],
      "AgentHeaders": {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Host": "code.jquery.com",
        "Referer": "http://code.jquery.com/",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"
      },
      "Cookies": [
        {
          "name": "BobCookie",
          "value": "splat",
          "transforms": [
            {
              "function": "prepend",
              "parameters": [
                "splatity_"
              ]
            }
          ]
        }
      ],
      "Body": [
        {
          "function": "base64",
          "parameters": []
        },
        {
          "function": "prepend",
          "parameters": ["<html>"]
        },
          {
          "function": "append",
          "parameters": ["</html>"]
        }
      ]
    }]
  },
  "jitter": 50,
  "interval": 10,
  "chunk_size": 5120000,
  "key_exchange": true,
  "kill_date": ""
}
```