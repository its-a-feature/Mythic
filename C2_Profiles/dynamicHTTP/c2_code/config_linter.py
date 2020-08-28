#! /usr/bin/env python3
import json
import sys
import os


class bcolors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


def check_server_layout(server_config):
    if "instances" not in server_config:
        print(
            f'{bcolors.FAIL}[-]{bcolors.ENDC} config.json must start with "instances"'
        )

    for inst in server_config["instances"]:
        # loop through all the instances listed to see if the supplied config matches one of them
        for method in ["GET", "POST"]:
            if method not in inst:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "{method}" element in instance'
                )
                sys.exit(1)
            if "ServerBody" not in inst[method]:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "ServerBody" array in {method}'
                )
                sys.exit(1)
            for f in inst[method]["ServerBody"]:
                if "function" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "function" name in {method} ServerBody'
                    )
                    sys.exit(1)
                if "parameters" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "parameters" array in {method} in ServerBody (can be an empty array indicated by []'
                    )
                    sys.exit(1)
            if "ServerHeaders" not in inst[method]:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "ServerHeaders" dictionary'
                )
                sys.exit(1)
            if "ServerCookies" not in inst[method]:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "ServerCookies" dictionary'
                )
                sys.exit(1)
            if "AgentMessage" not in inst[method]:
                print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "AgentMessage" array')
                sys.exit(1)
            if len(inst[method]["AgentMessage"]) == 0:
                print(
                    f'[*] "AgentMessage" array is empty, so you won\'t be able to do {method} messages'
                )
            for m in inst[method]["AgentMessage"]:
                if "urls" not in m:
                    print(
                        '[-] Missing "urls" array indicating urls where the agent will reach out to'
                    )
                    sys.exit(1)
                if "uri" not in m:
                    print(
                        '[-] Missing "uri" indicator of what the URI will be. If not in use, set to empty string'
                    )
                    sys.exit(1)
                if "urlFunctions" not in m:
                    print(
                        '[-] Missing "urlFunctions" array, if you don\'t intent to do any manipulations here, set to empty array []'
                    )
                    sys.exit(1)
                for f in m["urlFunctions"]:
                    if "name" not in f:
                        print('[-] Missing "name" parameter in urlFunction')
                        sys.exit(1)
                    if "value" not in f:
                        print(
                            '[-] Missing "value" parameter in urlFunction. This is the starting value before transforms are applied'
                        )
                        sys.exit(1)
                    if "transforms" not in f:
                        print(
                            '[-] Missing "transforms" array. If no transforms needed, set to empty array []'
                        )
                        sys.exit(1)
                    for t in f["transforms"]:
                        if "function" not in t:
                            print(
                                '[-] Missing "function" name in transforms in urlFunctions'
                            )
                            sys.exit(1)
                        if "parameters" not in t:
                            print(
                                '[-] Missing "parameters" array in transforms in urlFunctions (can be an empty array indicated by []'
                            )
                            sys.exit(1)
                if "AgentHeaders" not in m:
                    print(
                        '[-] Missing "AgentHeaders" dictionary, this can be blank if the agent won\'t set any headers (i.e. {}'
                    )
                    sys.exit(1)
                if "QueryParameters" not in m:
                    print(
                        '[-] Missing "QueryParameters" array in GET. If no query parameters will be set, leave as empty array []'
                    )
                    sys.exit(1)
                for f in m["QueryParameters"]:
                    if "name" not in f:
                        print('[-] Missing "name" parameter in QueryParameters')
                        sys.exit(1)
                    if "value" not in f:
                        print(
                            '[-] Missing "value" parameter in QueryParameters. This is the starting value before transforms are applied'
                        )
                        sys.exit(1)
                    if "transforms" not in f:
                        print(
                            '[-] Missing "transforms" array. If no transforms needed, set to empty array []'
                        )
                        sys.exit(1)
                    for t in f["transforms"]:
                        if "function" not in t:
                            print(
                                '[-] Missing "function" name in transforms in QueryParameters'
                            )
                            sys.exit(1)
                        if "parameters" not in t:
                            print(
                                '[-] Missing "parameters" array in transforms in QueryParameters (can be an empty array indicated by []'
                            )
                            sys.exit(1)
                if "Cookies" not in m:
                    print(
                        '[-] Missing "Cookies" array in GET. If none will be set, leave as empty array []'
                    )
                    sys.exit(1)
                for f in m["Cookies"]:
                    if "name" not in f:
                        print('[-] Missing "name" parameter in Cookies')
                        sys.exit(1)
                    if "value" not in f:
                        print(
                            '[-] Missing "value" parameter in Cookies. This is the starting value before transforms are applied'
                        )
                        sys.exit(1)
                    if "transforms" not in f:
                        print(
                            '[-] Missing "transforms" array. If no transforms needed, set to empty array []'
                        )
                        sys.exit(1)
                    for t in f["transforms"]:
                        if "function" not in t:
                            print(
                                '[-] Missing "function" name in transforms in Cookies'
                            )
                            sys.exit(1)
                        if "parameters" not in t:
                            print(
                                '[-] Missing "parameters" array in transforms in Cookies (can be an empty array indicated by []'
                            )
                            sys.exit(1)
                if "Body" not in m:
                    print(
                        '[-] Missing "Body" array in GET message. If none will be supplied, set as empty array []'
                    )
                    sys.exit(1)
        if "no_match" not in inst:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "no_match" dictionary')
            sys.exit(1)
        if "action" not in inst["no_match"]:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "action" key in "no_match"')
            sys.exit(1)
        if inst["no_match"]["action"] not in [
            "redirect",
            "proxy_get",
            "proxy_post",
            "return_file",
        ]:
            print(
                f"{bcolors.FAIL}[-]{bcolors.ENDC} no_match action isn't in the approved list"
            )
            sys.exit(1)
        if "redirect" not in inst["no_match"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "redirect" option in no_match'
            )
            sys.exit(1)
        if "proxy_get" not in inst["no_match"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "proxy_get" option in no_match'
            )
            sys.exit(1)
        if "url" not in inst["no_match"]["proxy_get"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "url" in no_match\'s proxy_get dictionary'
            )
            sys.exit(1)
        if "status" not in inst["no_match"]["proxy_get"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "status" code for no_match\'s proxy_get dictionary'
            )
            sys.exit(1)
        if "proxy_post" not in inst["no_match"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "proxy_post" option in no_match'
            )
            sys.exit(1)
        if "url" not in inst["no_match"]["proxy_post"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "url" in no_match\'s proxy_post dictionary'
            )
            sys.exit(1)
        if "status" not in inst["no_match"]["proxy_post"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "status" code in no_match\'s proxy_post dictionary'
            )
            sys.exit(1)
        if "return_file" not in inst["no_match"]:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "return_file" in no_match')
            sys.exit(1)
        if "name" not in inst["no_match"]["return_file"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "name" for the file to be returned in no_match case'
            )
            sys.exit(1)
        if not os.path.exists(inst["no_match"]["return_file"]["name"]):
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} File specified in "no_match" case for "return_file" can\'t be found'
            )
            sys.exit(1)
        if "status" not in inst["no_match"]["return_file"]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Misisng "status" return code for no_match\'s return_file'
            )
            sys.exit(1)
        if "port" not in inst:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "port" in instance')
            sys.exit(1)
        if "key_path" not in inst:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "key_path" in instance')
            sys.exit(1)
        if inst["key_path"] != "" and not os.path.exists(inst["key_path"]):
            print(f"{bcolors.FAIL}[-]{bcolors.ENDC} Key_path file can't be found")
            sys.exit(1)
        if "cert_path" not in inst:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "cert_path" in instance')
            sys.exit(1)
        if inst["cert_path"] != "" and not os.path.exists(inst["cert_path"]):
            print(f"{bcolors.FAIL}[-]{bcolors.ENDC} cert_path file can't be found")
            sys.exit(1)
        if "debug" not in inst:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "debug" boolean in instance'
            )
            sys.exit(1)


def check_agent_config_layout(inst):
    for method in ["GET", "POST"]:
        if method not in inst:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "{method}" element in instance'
            )
            sys.exit(1)
        if "ServerBody" not in inst[method]:
            print(
                f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "ServerBody" array in {method}'
            )
            sys.exit(1)
        for f in inst[method]["ServerBody"]:
            if "function" not in f:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "function" name in {method} ServerBody'
                )
                sys.exit(1)
            if "parameters" not in f:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "parameters" array in {method} in ServerBody (can be an empty array indicated by []'
                )
                sys.exit(1)
        if "ServerHeaders" not in inst[method]:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "ServerHeaders" dictionary')
            sys.exit(1)
        if "ServerCookies" not in inst[method]:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "ServerCookies" dictionary')
            sys.exit(1)
        if "AgentMessage" not in inst[method]:
            print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "AgentMessage" array')
            sys.exit(1)
        if len(inst[method]["AgentMessage"]) == 0:
            print(
                f'[*] "AgentMessage" array is empty, so you won\'t be able to do {method} messages'
            )
        for m in inst[method]["AgentMessage"]:
            if "urls" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "urls" array indicating urls where the agent will reach out to'
                )
                sys.exit(1)
            if "uri" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "uri" indicator of what the URI will be. If not in use, set to empty string'
                )
                sys.exit(1)
            if "urlFunctions" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "urlFunctions" array, if you don\'t intent to do any manipulations here, set to empty array []'
                )
                sys.exit(1)
            for f in m["urlFunctions"]:
                if "name" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "name" parameter in urlFunction'
                    )
                    sys.exit(1)
                if "value" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "value" parameter in urlFunction. This is the starting value before transforms are applied'
                    )
                    sys.exit(1)
                if "transforms" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "transforms" array. If no transforms needed, set to empty array []'
                    )
                    sys.exit(1)
                for t in f["transforms"]:
                    if "function" not in t:
                        print(
                            f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "function" name in transforms in urlFunctions'
                        )
                        sys.exit(1)
                    if "parameters" not in t:
                        print(
                            f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "parameters" array in transforms in urlFunctions (can be an empty array indicated by []'
                        )
                        sys.exit(1)
            if "AgentHeaders" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "AgentHeaders" dictionary, this can be blank if the agent won\'t set any headers'
                )
                sys.exit(1)
            if "QueryParameters" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "QueryParameters" array in GET. If no query parameters will be set, leave as empty array []'
                )
                sys.exit(1)
            for f in m["QueryParameters"]:
                if "name" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "name" parameter in QueryParameters'
                    )
                    sys.exit(1)
                if "value" not in f:
                    print(
                        '[-] Missing "value" parameter in QueryParameters. This is the starting value before transforms are applied'
                    )
                    sys.exit(1)
                if "transforms" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "transforms" array. If no transforms needed, set to empty array []'
                    )
                    sys.exit(1)
                for t in f["transforms"]:
                    if "function" not in t:
                        print(
                            f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "function" name in transforms in QueryParameters'
                        )
                        sys.exit(1)
                    if "parameters" not in t:
                        print(
                            f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "parameters" array in transforms in QueryParameters (can be an empty array indicated by []'
                        )
                        sys.exit(1)
            if "Cookies" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "Cookies" array in GET. If none will be set, leave as empty array []'
                )
                sys.exit(1)
            for f in m["Cookies"]:
                if "name" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "name" parameter in Cookies'
                    )
                    sys.exit(1)
                if "value" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "value" parameter in Cookies. This is the starting value before transforms are applied'
                    )
                    sys.exit(1)
                if "transforms" not in f:
                    print(
                        f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "transforms" array. If no transforms needed, set to empty array []'
                    )
                    sys.exit(1)
                for t in f["transforms"]:
                    if "function" not in t:
                        print(
                            f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "function" name in transforms in Cookies'
                        )
                        sys.exit(1)
                    if "parameters" not in t:
                        print(
                            f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "parameters" array in transforms in Cookies (can be an empty array indicated by []'
                        )
                        sys.exit(1)
            if "Body" not in m:
                print(
                    f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "Body" array in GET message. If none will be supplied, set as empty array []'
                )
                sys.exit(1)
    if "jitter" not in inst:
        print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "jitter"')
        sys.exit(1)
    if "interval" not in inst:
        print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "interval"')
        sys.exit(1)
    if "chunk_size" not in inst:
        print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "chunk_size"')
        sys.exit(1)
    if "key_exchange" not in inst:
        print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "key_exchange" boolean')
        sys.exit(1)
    if "kill_date" not in inst:
        print(f'{bcolors.FAIL}[-]{bcolors.ENDC} Missing "kill_date"')
        sys.exit(1)


def check_config(server_config, agent_config, method):
    # get info for agent config
    agent_message = {"location": "", "value": "", "method": method}
    print(f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Looking into {method} AgentMessages")
    for g in agent_config[method]["AgentMessage"]:
        # we need to find where the "message" parameter exists so we know where the data will be
        agent_message["urls"] = g["urls"]
        agent_message["uri"] = g["uri"]
        print(
            f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Current URLs: {g['urls']}\n\tCurrent URI: {g['uri']}"
        )
        for p in g["QueryParameters"]:
            if p["value"] == "message":
                print(
                    f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Found 'message' keyword in QueryParameter {p['name']}"
                )
                agent_message["location"] = "QueryParameters"
                agent_message["value"] = p
        for p in g["Cookies"]:
            if p["value"] == "message":
                print(
                    f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Found 'message' keyword in Cookies {p['name']}"
                )
                agent_message["location"] = "Cookies"
                agent_message["value"] = p
        for p in g["urlFunctions"]:
            if p["name"] == "<message:string>":
                print(
                    f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Found '<message:string>' keyword in urlFunctions"
                )
                agent_message["location"] = "URI"
                agent_message["value"] = p
        if agent_message["location"] == "":
            # if we haven't set it yet, data must be in the body
            print(
                f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Didn't find message keyword anywhere, assuming it to be the Body of the message"
            )
            agent_message["location"] = "Body"
            agent_message["value"] = g["Body"]
        print(
            f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Now checking server config for matching section"
        )
        check_match_to_server(server_config, agent_message)


def check_match_to_server(server_config, agent_message):
    for inst in server_config["instances"]:
        # only look into AgentMessage details if the urls and uri match
        for g in inst[agent_message["method"]]["AgentMessage"]:
            match = False
            if agent_message["uri"] != g["uri"]:
                continue
            if not urls_match(agent_message["urls"], g["urls"]):
                continue
            else:
                print(
                    f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Found matching URLs and URI, checking rest of AgentMessage"
                )
            if agent_message["location"] == "Body":
                print(
                    f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Checking for matching Body messages"
                )
                match = body_match(g["Body"], agent_message["value"])
            else:
                match = contains_element(
                    agent_message["value"], g[agent_message["location"]]
                )
            if match:
                print(f"{bcolors.OKGREEN}[+]{bcolors.ENDC} FOUND MATCH")
                return True
            else:
                print(
                    f"{bcolors.FAIL}[-]{bcolors.ENDC} Matched URLs/URI failed to match AgentMessages"
                )
                return False
    print(f"{bcolors.FAIL}[-]{bcolors.ENDC} Failed to find any matching URLs/URIs")
    return False


def transforms_match(arr1, arr2):
    if len(arr1) != len(arr2):
        return False
    for i in range(len(arr1)):
        if arr1[i]["function"] != arr2[i]["function"]:
            return False
        if len(arr1[i]["parameters"]) != len(arr2[i]["parameters"]):
            return False
        for j in range(len(arr1[i]["parameters"])):
            if arr1[i]["parameters"][j] != arr2[i]["parameters"][j]:
                return False
    return True


def body_match(arr1, arr2):
    if len(arr1) != len(arr2):
        return False
    for e in range(len(arr1)):
        if arr1[e]["function"] != arr2[e]["function"]:
            return False
        if len(arr1[e]["parameters"]) != len(arr2[e]["parameters"]):
            return False
        for p in range(len(arr1[e]["parameters"])):
            if arr1[e]["parameters"][p] != arr2[e]["parameters"][p]:
                return False
    return True


def contains_element(ele, arr):
    # check  if arr  contains ele
    for i in arr:
        if i["name"] == ele["name"]:
            if i["value"] == ele["value"]:
                if transforms_match(ele["transforms"], i["transforms"]):
                    return True
    return False


def urls_match(arr1, arr2):
    if len(arr1) != len(arr2):
        return False
    for i in range(len(arr1)):
        if arr1[i] not in arr2:
            return False
    return True


if __name__ == "__main__":
    if os.path.exists("config.json"):
        server_config = json.load(open("config.json"))
    else:
        print(f"{bcolors.FAIL}[-]{bcolors.ENDC} Can't find config.json")
        sys.exit(1)

    if len(sys.argv) < 2:
        print(
            f"{bcolors.FAIL}[-]{bcolors.ENDC} Please specify an agent config file on the command line"
        )
        sys.exit(1)

    if os.path.exists(sys.argv[1]):
        agent_config = json.load(open(sys.argv[1]))
    else:
        print(f"{bcolors.FAIL}[-]{bcolors.ENDC} Can't find the supplied file")
        sys.exit(1)
    # first, check that the two configs have all the right pieces
    print(
        f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Checking server config for layout structure"
    )
    check_server_layout(server_config)
    print(f"{bcolors.OKGREEN}[+]{bcolors.ENDC} Server config layout structure is good")
    print(
        f"{bcolors.OKBLUE}[*]{bcolors.ENDC} Checking agent config for layout structure"
    )
    check_agent_config_layout(agent_config)
    print(f"{bcolors.OKGREEN}[+]{bcolors.ENDC} Agent config layout structure is good")
    # now check that server_config can understand an agent_config message
    # first check a GET request
    check_config(server_config, agent_config, "GET")
    check_config(server_config, agent_config, "POST")
