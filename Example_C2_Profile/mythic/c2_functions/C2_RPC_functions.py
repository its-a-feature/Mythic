"""This file provides basic examples of the C2 RPC functions.

The following functions are implemented to provide an example of implementation:
- test
- opsec: checks C2 profile parameters to verify they meet user-specified OPSEC-safe implementations
- config_check: check and validate supplied parameters when an payload request is generated
- redirect_rules: generate redirect rules for a specific payload when called on-demand by operator

Documentation follows Google Python Style Guide for comments:
https://github.com/google/styleguide/blob/gh-pages/pyguide.md#38-comments-and-docstrings
"""
from mythic_c2_container.MythicRPC import *
import json
import netifaces

async def test(request):
    """Performs a test.
    Args:
        request: dict containing the function name, and parameters passed for the payload build.
         {"action": func_name, "message": "the input", "task_id": task id num}

    Returns:
        A RPCResponse object containing status and response message
    """
    response = RPCResponse()
    response.status = RPCStatus.Success
    response.response = "hello"
    resp = await MythicRPC().execute("create_event_message", message="Test message", warning=False)
    return response

async def opsec(request):
    """Checks C2 profile parameters to verify they meet user-specified OPSEC-safe implementations.
    
    Args:
        request: dict containing the function name, and parameters passed for the payload build.
        
        { "action": "opsec", "parameters": {"param_name": "param_value", "param_name2": "param_value2", ....} }

    Returns:
        A dict containing either a success or error status/message. For example:
        
        success: {"status": "success", "message": "<your success message here>" }
        error:   {"status": "error", "error": "<your error message here>" }
    """
    # perform OPSEC checks against the parameters. In this example, the callback port
    # is checked against common HTTPS ports when the callback host contains "https"
    params = request["parameters"]
    if "https" in params["callback_host"] and params["callback_port"] not in ["443", "8443", "7443"]:
         return {"status": "error", "error": f"Mismatch - HTTPS specified, but port {params['callback_port']}, is not one of the standard port (443, 8443)\n"}

    # if no OPSEC checks, just return the following message
    # return {"status": "success", "message": "No OPSEC checks performed\n"}
    # otherwise, indicate that OPSEC checks were successful
    return {"status": "success", "message": "Basic OPSEC checks passed\n"}



async def config_check(request):
    """Check and validate supplied parameters when an payload request is generated.
    
    Args:
        request: dict containing the function name, and parameters passed for the payload build.

        { "action": "config_check", "parameters": {"param_name": "param_value", "param_name2": "param_value2", ....} }

    Returns:
        A dict containing either a success or error status/message. For example:
        
        success: {"status": "success", "message": "<your success message here>" }
        error:   {"status": "error", "error": "<your error message here>" }
    """
    # Open the C2 profile's config.json and, build a list of ports, and confirm port use.
    # This example code uses the default config.json.
    try:
        
        with open("../c2_code/config.json") as f:
            config = json.load(f)
            possible_ports = []
            for inst in config["instances"]:
                possible_ports.append({"port": inst["port"], "use_ssl": inst["use_ssl"]})
                if str(inst["port"]) == str(request["parameters"]["callback_port"]):
                    if "https" in request["parameters"]["callback_host"] and not inst["use_ssl"]:
                        message = f"C2 Profile container is configured to NOT use SSL on port {inst['port']}, but the callback host for the agent is using https, {request['parameters']['callback_host']}.\n\n"
                        message += "This means there should be the following connectivity for success:\n"
                        message += f"Agent via SSL to {request['parameters']['callback_host']} on port {inst['port']}, then redirection to C2 Profile container WITHOUT SSL on port {inst['port']}"
                        return {"status": "error", "error": message}
                    elif "https" not in request["parameters"]["callback_host"] and inst["use_ssl"]:
                        message = f"C2 Profile container is configured to use SSL on port {inst['port']}, but the callback host for the agent is using http, {request['parameters']['callback_host']}.\n\n"
                        message += "This means there should be the following connectivity for success:\n"
                        message += f"Agent via NO SSL to {request['parameters']['callback_host']} on port {inst['port']}, then redirection to C2 Profile container WITH SSL on port {inst['port']}"
                        return {"status": "error", "error": message}
                    else:
                        message = f"C2 Profile container and agent configuration match port, {inst['port']}, and SSL expectations.\n"
                        return {"status": "success", "message": message}
            message = f"Failed to find port, {request['parameters']['callback_port']}, in C2 Profile configuration\n"
            message += f"This could indicate the use of a redirector, or a mismatch in expected connectivity.\n\n"
            message += f"This means there should be the following connectivity for success:\n"
            if "https" in request["parameters"]["callback_host"]:
                message += f"Agent via HTTPS on port {request['parameters']['callback_port']} to {request['parameters']['callback_host']} (should be a redirector).\n"
            else:
                message += f"Agent via HTTP on port {request['parameters']['callback_port']} to {request['parameters']['callback_host']} (should be a redirector).\n"
            if len(possible_ports) == 1:
                message += f"Redirector then forwards request to C2 Profile container on port, {possible_ports[0]['port']}, {'WITH SSL' if possible_ports[0]['use_ssl'] else 'WITHOUT SSL'}"
            else:
                message += f"Redirector then forwards request to C2 Profile container on one of the following ports: {json.dumps(possible_ports)}\n"
            if "https" in request["parameters"]["callback_host"]:
                message += f"\nAlternatively, this might mean that you want to do SSL but are not using SSL within your C2 Profile container.\n"
                message += f"To add SSL to your C2 profile:\n"
                message += f"\t1. Go to the C2 Profile page\n"
                message += f"\t2. Click configure for the http profile\n"
                message += f"\t3. Change 'use_ssl' to 'true' and make sure the port is {request['parameters']['callback_port']}\n"
                message += f"\t4. Click to stop the profile and then start it again\n"
            return {"status": "success", "message": message}
    except Exception as e:
        return {"status": "error", "error": str(e)}



async def redirect_rules(request):
    """Generate redirect rules for a specific payload when called on-demand by operator.

    Operationally, users invoke this function from the Payloads page in the Mythic UI with a
    dropdown menu for the payload they're interested in. These rules can include functionality
    such as Apache mod_rewrite rules, Nginx configurations, etc. This function simply generates
    output that the operator must then copy and implement on a redirector.

    Args:
        request: dict containing the function name, and the same profile parameters that were
        passed to the opsec and config_check functions.
        
        { "action": "redirect_rules", "parameters": {"param_name": "param_value", "param_name2": "param_value2", ....} }

    Returns:
        A dict containing either a success or error status/message. For example:
    
        success: {"status": "success", "message": "<your success message here>" }
        error:   {"status": "error", "error": "<your error message here>" }

    """
    # This example generates Apache mod_rewrite rules for Mythic C2 profiles
    # to redirect non-C2 traffic to another site.
    output = "mod_rewrite rules generated from @AndrewChiles' project https://github.com/threatexpress/mythic2modrewrite:\n"
    # Get User-Agent
    errors = ""
    ua = ''
    uris = []
    if "headers" in request['parameters']:
        for header in request['parameters']["headers"]:
            if header["key"] == "User-Agent":
                ua = header["value"]
    else:
        errors += "[!] User-Agent Not Found\n"
    # Get all profile URIs
    if "get_uri" in request['parameters']:
        uris.append("/" + request['parameters']["get_uri"])
    else:
        errors += "[!] No GET URI found\n"
    if "post_uri" in request['parameters']:
        uris.append("/" + request['parameters']["post_uri"])
    else:
        errors += "[!] No POST URI found\n"
    # Create UA in modrewrite syntax. No regex needed in UA string matching, but () characters must be escaped
    ua_string = ua.replace('(', '\(').replace(')', '\)')
    # Create URI string in modrewrite syntax. "*" are needed in regex to support GET and uri-append parameters on the URI
    uris_string = ".*|".join(uris) + ".*"
    try:
        interface = netifaces.gateways()['default'][netifaces.AF_INET][1]
        address = netifaces.ifaddresses(interface)[netifaces.AF_INET][0]['addr']
        c2_rewrite_template = """RewriteRule ^.*$ "{c2server}%{{REQUEST_URI}}" [P,L]"""
        c2_rewrite_output = []
        with open("../c2_code/config.json") as f:
            config = json.load(f)
            for inst in config["instances"]:
                c2_rewrite_output.append(c2_rewrite_template.format(
                    c2server=f"https://{address}:{inst['port']}" if inst["use_ssl"] else f"http://{address}:{inst['port']}"
                ))
    except Exception as e:
        errors += "[!] Failed to get C2 Profile container IP address. Replace 'c2server' in HTACCESS rules with correct IP\n"
        c2_rewrite_output = ["""RewriteRule ^.*$ "{c2server}%{{REQUEST_URI}}" [P,L]"""]
    htaccess_template = '''
########################################
## .htaccess START
RewriteEngine On
## C2 Traffic (HTTP-GET, HTTP-POST, HTTP-STAGER URIs)
## Logic: If a requested URI AND the User-Agent matches, proxy the connection to the Teamserver
## Consider adding other HTTP checks to fine tune the check.  (HTTP Cookie, HTTP Referer, HTTP Query String, etc)
## Refer to http://httpd.apache.org/docs/current/mod/mod_rewrite.html
## Only allow GET and POST methods to pass to the C2 server
RewriteCond %{{REQUEST_METHOD}} ^(GET|POST) [NC]
## Profile URIs
RewriteCond %{{REQUEST_URI}} ^({uris})$
## Profile UserAgent
RewriteCond %{{HTTP_USER_AGENT}} "{ua}"
{c2servers}
## Redirect all other traffic here
RewriteRule ^.*$ {redirect}/? [L,R=302]
## .htaccess END
########################################
    '''
    htaccess = htaccess_template.format(uris=uris_string, ua=ua_string, c2servers="\n".join(c2_rewrite_output), redirect="redirect")
    output += "\tReplace 'redirect' with the http(s) address of where non-matching traffic should go, ex: https://redirect.com\n"
    output += f"\n{htaccess}"
    if errors != "":
        return {"status": "error", "error": errors}
    else:
        return {"status": "success", "message": output}
