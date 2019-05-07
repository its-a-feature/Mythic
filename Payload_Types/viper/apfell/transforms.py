import re
import base64
import os
from typing import List, Dict, NewType
import asyncio
import uuid
import shutil
import zipfile

FilePath = NewType('FilePath', str)
FileName = NewType('FileName', str)
ParameterName = NewType('ParameterName', str)
DataDictAsString = NewType('DataDictAsString', str)


class CommandTransformOperation:
    # These commands take in the parameters of the Task, do something to them, and returns the params that will be used
    # Each transform can optionally take in a parameter to help it do its tasks
    async def base64EncodeShell(self, task_params: str, parameter: None) -> str:
        encoded = base64.b64encode(str.encode(task_params)).decode('utf-8')
        return "echo '{}' | base64 -D | sh".format(encoded)

    async def base64EncodeLinuxShell(self, task_params: str, parameter: None) -> str:
        encoded = base64.b64encode(str.encode(task_params)).decode('utf-8')
        return "echo '{}' | base64 -d | sh".format(encoded)

    async def base64EncodeLinuxCommand(self, task_params: str, parameter: ParameterName) -> str:
        # finds the field indicated by 'parameter' and updates it to be base64 encoded
        import json
        param_dict = json.loads(task_params)
        encoded = base64.b64encode(str.encode(param_dict[parameter])).decode('utf-8')
        param_dict[parameter] = "echo '{}' | base64 -d | sh".format(encoded)
        return json.dumps(param_dict)


class TransformOperation:
    def __init__(self, working_dir=""):
        self.working_dir = working_dir
        self.saved_state = {}

    async def combineCommands(self, prior_output: Dict[str, str], parameter: None) -> bytes:
        # expects a dictionary of {cmd_name: base64 str of full command file
        files = b""
        for n,v in prior_output.items():
            # only read up until the flag COMMAND_ENDS_HERE
            file_content = base64.b64decode(v).decode('utf-8')
            try:
                end_index = file_content.index("COMMAND_ENDS_HERE")
                file_content = file_content[0:end_index]
            except Exception as e:
                pass
            file_content = bytearray(file_content.encode('utf-8'))
            files += file_content
        return files

    async def readCommands(self, prior_output: Dict[str, str], parameter: None) -> List[bytes]:
        files = []
        for n,v in prior_output.items():
            # only read up until the flag COMMAND_ENDS_HERE
            file_content =base64.b64decode(v).decode('utf-8')
            try:
                end_index = file_content.index("COMMAND_ENDS_HERE")
                file_content = file_content[0:end_index]
            except Exception as e:
                pass
            file_content = bytearray(file_content.encode('utf-8'))
            files.append(file_content)
        return files

    async def readHeaders(self, prior_output: Dict[str, str], parameter: None) -> List[bytes]:
        files = []
        for n,v in prior_output.items():
            # only read up until the flag COMMAND_ENDS_HERE
            file_content = base64.b64decode(v).decode('utf-8')
            try:
                start_index = file_content.index("COMMAND_ENDS_HERE")
                file_content = file_content[start_index + len("COMMAND_ENDS_HERE"):]
            except Exception as e:
                pass
            file_content = bytearray(file_content.encode('utf-8'))
            files.append(file_content)
        return files

    async def saveCommandsAndHeaders(self, prior_output: Dict[str, str], parameter: None) -> None:
        self.saved_state['commands'] = await self.readCommands(prior_output, parameter)
        self.saved_state['headers'] = await self.readHeaders(prior_output, parameter)
        return

    async def stampSavedCommands(self, prior_output: None, parameter: FileName) -> None:
        # write out what's saved in self.saved_state['commands'] to the file, parameter, in COMMANDS_HERE
        file = open(self.working_dir + "/" + parameter, 'r')
        temp_uuid = str(uuid.uuid4())
        updated_file = open(self.working_dir + "/" + temp_uuid, 'w')
        for line in file:
            if "COMMANDS_HERE" in line:
                for command in self.saved_state['commands']:
                    updated_file.write(command.decode("utf-8"))
            else:
                updated_file.write(line)
        file.close()
        updated_file.close()
        os.remove(self.working_dir + "/" + parameter)
        os.rename(self.working_dir + "/" + temp_uuid, self.working_dir + "/" + parameter)

    async def stampSavedHeaders(self, prior_output: None, parameter: FileName) -> None:
        # write out what's saved in self.saved_state['headers'] to the file, parameter, in COMMAND_HEADERS_HERE
        file = open(self.working_dir + "/" + parameter, 'r')
        temp_uuid = str(uuid.uuid4())
        updated_file = open(self.working_dir + "/" + temp_uuid, 'w')
        for line in file:
            if "COMMAND_HEADERS_HERE" in line:
                for header in self.saved_state['headers']:
                    updated_file.write(header.decode("utf-8"))
            else:
                updated_file.write(line)
        file.close()
        updated_file.close()
        os.remove(self.working_dir + "/" + parameter)
        os.rename(self.working_dir + "/" + temp_uuid, self.working_dir + "/" + parameter)

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

    async def readFileToBytearray(self, prior_output: None, file_path: FilePath) -> bytearray:
        return bytearray(open("/Apfell/{}/{}".format(self.working_dir, file_path), 'rb').read())

    async def convertBytesToString(self, prior_output: bytearray, parameter: None) -> str:
        return prior_output.decode("utf-8")

    async def removeSlashes(self, prior_output: str, parameter: None) -> str:
        return re.sub(r'\\\\', r'\\', prior_output)

    async def escapeSlashes(self, prior_output: str, parameter: None) -> str:
        return re.sub(r'\\', r'\\\\', prior_output)

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

    async def outputPythonLoadsAsZipFolder(self, prior_output: Dict[str, str], parameter: None) -> bytearray:
        try:
            # this does force .zip to output: ex: payload.location of test-payload becomes test-payload.zip on disk
            for n, v in prior_output.items():
                # only read up until the flag COMMAND_ENDS_HERE
                file_content = base64.b64decode(v).decode('utf-8')
                try:
                    end_index = file_content.index("COMMAND_ENDS_HERE")
                    file_content = file_content[0:end_index]
                except Exception as e:
                    pass
                file_content = bytearray(file_content.encode('utf-8'))

                f = open(n + ".py", 'wb')
                f.write(file_content)
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
