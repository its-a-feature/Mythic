import re
import base64
import os
from typing import List, Dict, NewType
import asyncio
import uuid
import shutil
import zipfile
import sys, os

FilePath = NewType('FilePath', str)
FileName = NewType('FileName', str)
ParameterName = NewType('ParameterName', str)
DataDictAsString = NewType('DataDictAsString', str)


class CommandTransformOperation:
    def __init__(self, file_mapping):
        self.file_mapping = file_mapping
        # file mapping is an array of lists where:
        #  index 0 is the name of the associated parameter
        #  index 1 should be set as None to indicate a file still needs to be created
        #  index 2 is the name of the file to be created when written to disk on Apfell (just filename, no path)
        #  index 3 is a boolean to indicate if the file should be deleted after an agent pulls it down (True = delete after pull down)
        # if you want to create your own registered file on the back-end as a result of your transform
        #    simply add an entry to the self.file_mapping list with the above data and make sure the corresponding
        #    dictionary entry in the parameters is the base64 version of the bytes of the file you want to write
        self.saved_dict = {}
        self.saved_array = []
    # These commands take in the parameters of the Task, do something to them, and returns the params that will be used
    # Each transform can optionally take in a parameter to help it do its tasks
    async def base64EncodeMacShell(self, task_params: str, parameter: None) -> str:
        encoded = base64.b64encode(str.encode(task_params)).decode('utf-8')
        return "echo '{}' | base64 -D | sh".format(encoded)

    async def base64EncodeLinuxShell(self, task_params: str, parameter: None) -> str:
        encoded = base64.b64encode(str.encode(task_params)).decode('utf-8')
        return "echo '{}' | base64 -d | sh".format(encoded)

    async def base64EncodeLinuxParameter(self, task_params: str, parameter: ParameterName) -> str:
        # finds the field indicated by 'parameter' and updates it to be base64 encoded
        import json
        param_dict = json.loads(task_params)
        encoded = base64.b64encode(str.encode(param_dict[parameter])).decode('utf-8')
        param_dict[parameter] = "echo '{}' | base64 -d | sh".format(encoded)
        return json.dumps(param_dict)

    async def poseidon_cp_shorthand(self, task_params: str, parameter: None) -> str:
        import json
        import shlex
        try:
            json.loads(task_params)
            return task_params  # if it's already JSON, let it be
        except Exception as e:
            pass
        files = shlex.split(task_params)
        task_dict = {"source": files[0], "destination": files[1]}
        return json.dumps(task_dict)

    async def poseidon_mv_shorthand(self, task_params: str, parameter: None) -> str:
        import json
        import shlex
        try:
            json.loads(task_params)
            return task_params  # if it's already JSON, let it be
        except Exception as e:
            pass
        files = shlex.split(task_params)
        task_dict = {"source": files[0], "destination": files[1]}
        return json.dumps(task_dict)

    async def swap_shortnames(self, task_params: str, parameter: None) -> str:
        # sets a flag to swap parameters that end in _id with filenames if the current value exists as a file name
        import json
        try:
            params = json.loads(task_params)
            params['swap_shortnames'] = True
            return json.dumps(params)
        except Exception as e:
            print("can't add swap_shortnames field since it's not json")
        return task_params

    async def convert_to_file_id_param_name(self, task_params: str, parameter: None) -> str:
        import json
        try:
            params = json.loads(task_params)
            params['file_id'] = params['file']
            del params['file']
            for file_update in self.file_mapping:
                if file_update[0] == 'file':
                    file_update[0] = 'file_id'
                    file_update[3] = True
            return json.dumps(params)
        except Exception as e:
            raise(e)


class TransformOperation:
    def __init__(self, working_dir=""):
        self.working_dir = working_dir
        self.saved_dict = {}
        self.saved_array = []

    async def combineCommands(self, prior_output: List[str], parameter: None) -> bytes:
        # expects a list of commands and returns the "command" portion of all the files together
        content = b""
        for n in prior_output:
            # only read up until the flag COMMAND_ENDS_HERE
            files = os.listdir(self.working_dir + "/{}".format(n))
            for f in files:
                file_content = open(self.working_dir + "/{}/{}".format(n, f)).read()
                try:
                    end_index = file_content.index("COMMAND_ENDS_HERE")
                    file_content = file_content[0:end_index]
                except Exception as e:
                    pass
                file_content = bytearray(file_content.encode('utf-8'))
                content += file_content
        return content

    async def compile(self, prior_output: FilePath, compile_command: str) -> FilePath:
        # prior_output is the location where our new file will be created after compiling
        # compile_command is the thing we're going to execute (hopefully after some pre-processing is done)
        proc = await asyncio.create_subprocess_shell(compile_command,
                                                     stdout=asyncio.subprocess.PIPE,
                                                     stderr=asyncio.subprocess.PIPE,
                                                     cwd=self.working_dir)
        stdout, stderr = await proc.communicate()
        if stdout:
            print(f'[stdout]\n{stdout.decode()}')
        if stderr:
            print(f'[stderr]\n{stderr.decode()}')
            raise Exception(stderr.decode())
        # we return the status (in case that's something you want to print out) and where the new file is located
        print("called compile and returned final path of: {}".format(prior_output))
        return FilePath(prior_output)

    async def save_parameter(self, prior_output: None, parameter: str) -> None:
        self.saved_array.append(parameter)
        return None

    async def chrome_compile_and_return(self, prior_output: None, parameter: str) -> bytearray:
        ext_name, update_url, home_page_url, version = parameter.split(" ")
        file = open("{}/manifest-template.json".format(self.working_dir), 'r').read()
        file = file.replace("EXTENSION_NAME_REPLACE", ext_name)
        file = file.replace("DESCRIPTION_REPLACE", ext_name)
        file = file.replace("http://www.example.com/debugextension", home_page_url)
        file = file.replace("http://www.example.com/update.xml", update_url)
        file = file.replace("VERSION_REPLACE", version)
        updated_file = open("{}/extension/manifest.json".format(self.working_dir), 'w')
        updated_file.write(file)
        updated_file.close()
        #raise Exception("current working directory: " + str(os.listdir(self.working_dir)))
        shutil.copy("{}/chrome-extension.js".format(self.working_dir),"{}/extension/src/bg/main.js".format(self.working_dir))
        #command = "cp {}/chrome-extension.js {}/extension/src/bg/main.js;".format(self.working_dir, self.working_dir)
        command = "python /CRX3-Creator/main.py {}/extension".format(self.working_dir)
        proc = await asyncio.create_subprocess_shell(command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        stdout, stderr = await proc.communicate()
        if stdout:
            print(f'[stdout]\n{stdout.decode()}')
        if stderr:
            print(f'[stderr]\n{stderr.decode()}')
        if os.path.exists("{}/extension.crx".format(self.working_dir)):
            temp_uuid = str(uuid.uuid4())
            shutil.make_archive(temp_uuid, "zip", "{}".format(self.working_dir))
            return bytearray(open(temp_uuid + ".zip", 'rb').read())
        else:
            raise Exception(stderr.decode())

    async def poseidon_compile_and_return(self, prior_output: None, parameter: str) -> bytearray:
        if len(self.saved_array) != 3:
            raise Exception("Incorrect number of saved arguments")
        profile = self.saved_array[0]
        operating_system = self.saved_array[1]
        arch = self.saved_array[2]
        command = "mv {}.go pkg/profiles/; rm -rf /build; rm -rf /deps; rm -rf /go/src/poseidon;".format(profile)
        command += "mkdir -p /go/src/poseidon/src; mv * /go/src/poseidon/src; mv /go/src/poseidon/src/poseidon.go /go/src/poseidon/;"
        command += "cd /go/src/poseidon; export GOPATH=/go/src/poseidon;"
        if profile == "websocket":
            command += "go get -u github.com/gorilla/websocket;"
        command += "xgo -tags={} --targets={}/{} -out poseidon .".format(profile, operating_system, arch)
        proc = await asyncio.create_subprocess_shell(command, stdout=asyncio.subprocess.PIPE,
                                                     stderr=asyncio.subprocess.PIPE, cwd=self.working_dir)
        stdout, stderr = await proc.communicate()
        if stdout:
            print(f'[stdout]\n{stdout.decode()}')
        if stderr:
            print(f'[stderr]\n{stderr.decode()}')
        if os.path.exists("/build"):
            files = os.listdir("/build")
            if len(files) == 1:
                return bytearray(open("/build/" + files[0], 'rb').read())
            else:
                temp_uuid = str(uuid.uuid4())
                shutil.make_archive(temp_uuid, "zip", "/build")
                return bytearray(open(temp_uuid + ".zip", 'rb').read())
        else:
            # something went wrong, return our errors
            raise Exception(stderr.decode())

    async def readFileToBytearray(self, prior_output: None, file_path: FilePath) -> bytearray:
        return bytearray(open("/Apfell/{}/{}".format(self.working_dir, file_path), 'rb').read())

    async def strToByteArray(self, prior_output: str, parameter: None) -> bytearray:
        return bytearray(prior_output.encode('utf-8'))

    async def outputAsZipFolder(self, prior_output: str, parameter: None) -> bytearray:
        try:
            # this does force .zip to output: ex: payload.location of test-payload becomes test-payload.zip on disk
            temp_uuid = str(uuid.uuid4())
            shutil.make_archive(temp_uuid, 'zip', self.working_dir)
            data = open(temp_uuid + ".zip", 'rb').read()
            os.remove(temp_uuid + ".zip")
            return data
        except Exception as e:
            raise Exception(str(e))

    async def outputPythonLoadsAsZipFolder(self, prior_output: List[str], parameter: None) -> bytearray:
        try:
            # this does force .zip to output: ex: payload.location of test-payload becomes test-payload.zip on disk
            content = b""
            if len(prior_output) != 1:
                raise Exception("Can only load one command at a time")
            for n in prior_output:
                # only read up until the flag COMMAND_ENDS_HERE
                files = os.listdir(self.working_dir + "/{}".format(n))
                for f in files:
                    file_content = open(self.working_dir + "/{}/{}".format(n, f)).read()
                    try:
                        end_index = file_content.index("COMMAND_ENDS_HERE")
                        file_content = file_content[0:end_index]
                    except Exception as e:
                        pass
                    file_content = bytearray(file_content.encode('utf-8'))
                    content += file_content
                f = open(n + ".py", 'wb')
                f.write(content)
                f.close()
                zf = zipfile.ZipFile(n + ".zip", mode='w')
                zf.write(n + ".py")
                zf.close()
                data = open(n + ".zip", 'rb').read()
                os.remove(n + ".zip")
                os.remove(n + ".py")
                return data
        except Exception as e:
            raise Exception(str(e))