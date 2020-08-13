from CommandBase import *
import json


class ConfigArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class ConfigCommand(CommandBase):
    cmd = "config"
    needs_admin = False
    help_cmd = "config [info | domain | sleep | jitter | host_header | user_agent | param | proxy] [add | remove | use_default | address | username | password] [options]"
    description = """config				base command
options:
info				display current agent configuration
domain				option to add/remove C2 domain
	add				add a C2 domain to list of domains
	remove			remove a C2 domain from list of domains (will not let list be less then one domain)
sleep				sleep time between taskings in seconds
jitter				variation in sleep time, specify as a percentage
kill_date			date for agent to exit itself
host_header			host header to use for domain fronting
user_agent			user-agent header for web requests
param				option for query parameter used in GET requests
proxy				option to modify proxy settings
	use_default		true/false, choose whether to use system default settings or manual settings specified in config
	address			address of proxy server
	username		username to authenticate to proxy server
	password		password to authenticate to proxy server
Examples:
config info
config domain add http://hello.world
config sleep 60
config jitter 20
config kill_date 2020-03-01
config host_header cdn.cloudfront.com
config user_agent Mozilla 5.0 IE blah blah blah
config param order
config proxy use_default false
config proxy address 192.168.1.100
config proxy username harm.j0y
config proxy password Liv3F0rTh3Tw!ts
"""
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = ConfigArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
