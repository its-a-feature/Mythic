import re
import base64
import os
import datetime
from app.database_models.model import Payload
from typing import List, Dict, NewType
import asyncio
import json as js

FilePath = NewType('FilePath', str)
FileName = NewType('FileName', str)
DataDictAsString = NewType('DataDictAsString', str)


class CommandTransformOperation:
    # These commands take in the parameters of the Task, do something to them, and returns the params that will be used
    # Each transform can optionally take in a parameter to help it do its tasks
    async def base64EncodeShell(self, task_params: str, parameter: None) -> str:
        encoded = base64.b64encode(str.encode(task_params)).decode('utf-8')
        return "echo '{}' | base64 -D | sh".format(encoded)


class TransformOperation:
    # at the end of your transform sequence, just have the final return be the path of the file that should be served up
    # regardless of what you name your parameters, will always be passed in:
    #    payload, prior_output, parameter field
    # If you need to save some form of state, do whatever you want with the self.saved_state dictionary
    #   this will allow you to save extra state and information between transforms in a single chain, but not carry over
    def __init__(self, working_dir=""):
        self.working_dir = working_dir
        self.saved_state = {}

    async def readCommands(self, payload: Payload, prior_output: List[FilePath], parameter: None) -> List[bytes]:
        files = []
        for p in prior_output:
            # only read up until the flag COMMAND_ENDS_HERE
            file_content = open(p, 'r').read()
            try:
                end_index = file_content.index("COMMAND_ENDS_HERE")
                file_content = file_content[0:end_index]
            except Exception as e:
                pass
            file_content = bytearray(file_content.encode('utf-8'))
            files.append(file_content)
        return files

    async def readHeaders(self, payload: Payload, prior_output: List[FilePath], parameter: None) -> List[bytes]:
        files = []
        for p in prior_output:
            # only read up until the flag COMMAND_ENDS_HERE
            file_content = open(p, 'r').read()
            try:
                start_index = file_content.index("COMMAND_ENDS_HERE")
                file_content = file_content[start_index + len("COMMAND_ENDS_HERE"):]
            except Exception as e:
                pass
            file_content = bytearray(file_content.encode('utf-8'))
            files.append(file_content)
        return files

    async def saveDataDict(self, payload: Payload, prior_output: None, parameter: DataDictAsString) -> None:
        info_dict = js.loads(parameter)
        # should have in info_dict:   {"dict_key": "dict_value"}
        #  if multiple key/value pairs are given, save them all
        for key in info_dict:
            self.saved_state[key] = info_dict[key]
        return

    async def saveCommandsAndHeaders(self, payload: Payload, prior_output: List[FilePath], parameter: None) -> None:
        self.saved_state['commands'] = await self.readCommands(payload, prior_output, parameter)
        self.saved_state['headers'] = await self.readHeaders(payload, prior_output, parameter)
        return

    async def stampSavedCommands(self, payload: Payload, prior_output: None, parameter: FileName) -> None:
        # write out what's saved in self.saved_state['commands'] to the file, parameter, in COMMANDS_HERE
        # if there is a "commands_prefix" or "commands_suffix" in self.saved_state, pre/append those each time
        file = open(self.working_dir + parameter, 'r')
        updated_file = open(self.working_dir + payload.uuid, 'w')
        for line in file:
            if "COMMANDS_HERE" in line:
                for command in self.saved_state['commands']:
                    if "commands_prefix" in self.saved_state:
                        updated_file.write(self.saved_state['commands_prefix'])
                    updated_file.write(command.decode("utf-8"))
                    if "commands_suffix" in self.saved_state:
                        updated_file.write(self.saved_state['commands_suffix'])
            else:
                updated_file.write(line)
        file.close()
        updated_file.close()
        os.remove(self.working_dir + parameter)
        os.rename(self.working_dir + payload.uuid, self.working_dir + parameter)

    async def stampSavedHeaders(self, payload: Payload, prior_output: None, parameter: FileName) -> None:
        # write out what's saved in self.saved_state['headers'] to the file, parameter, in COMMAND_HEADERS_HERE
        # if there is a "headers_prefix" or "headers_suffix" in self.saved_state, pre/append those each time
        file = open(self.working_dir + parameter, 'r')
        updated_file = open(self.working_dir + payload.uuid, 'w')
        for line in file:
            if "COMMAND_HEADERS_HERE" in line:
                for header in self.saved_state['headers']:
                    if "headers_prefix" in self.saved_state:
                        updated_file.write(self.saved_state['headers_prefix'])
                    updated_file.write(header.decode("utf-8"))
                    if "headers_suffix" in self.saved_state:
                        updated_file.write(self.saved_state['headers_suffix'])
            else:
                updated_file.write(line)
        file.close()
        updated_file.close()
        os.remove(self.working_dir + parameter)
        os.rename(self.working_dir + payload.uuid, self.working_dir + parameter)

    async def base64Encode(self, payload: Payload, prior_output: bytearray, parameter: None) -> bytearray:
        return base64.b64encode(prior_output)

    async def base64Decode(self, payload: Payload, prior_output: bytearray, parameter: None) -> str:
        return base64.b64decode(prior_output).decode("utf-8")

    async def combineAppend(self, payload: Payload, prior_output: List[bytes], parameter: None) -> bytearray:
        combined = bytearray()
        for d in prior_output:
            combined += d
        return combined

    async def compile(self, payload: Payload, prior_output: FilePath, compile_command: str) -> FilePath:
        # prior_output is the location where our new file will be created after compiling
        # compile_command is the thing we're going to execute (hopefully after some pre-processing is done)
        proc = await asyncio.create_subprocess_shell(compile_command,
                                                     stdout=asyncio.subprocess.PIPE,
                                                     stderr=asyncio.subprocess.PIPE)
        stdout, stderr = await proc.communicate()
        if stdout:
            print(f'[stdout]\n{stdout.decode()}')
        if stderr:
            print(f'[stderr]\n{stderr.decode()}')
            raise Exception(stderr.decode())
        # we return the status (in case that's something you want to print out) and where the new file is located
        print("called compile and returned final path of: {}".format(prior_output))
        return FilePath(prior_output)

    async def preprocessCompile(self, payload: Payload, prior_output: Dict[str, str], parameter: None) -> str:
        # just parse the input dictionary and call the original compile to reduce redundant code
        print(prior_output)
        return await self.compile(payload, FilePath(prior_output['output_path']), prior_output['command'])

    async def preprocessLoadPaths(self, payload:Payload, prior_output: None, compile_command_with_tokens: str) -> Dict[str, str]:
        output_file_location = ""
        input_file_location = self.working_dir + "/"
        compile_command = compile_command_with_tokens.replace("{{input}}", input_file_location)
        # now we need to get our final output name from here
        try:
            index = compile_command.index("{{output/")  # if it's not found it'll get an exception and we move on
            end_index = compile_command.index("}}")
            output_file_location = os.path.dirname(input_file_location) + "/" + compile_command[index + 9:end_index]
            compile_command = compile_command[:index] + output_file_location + compile_command[end_index + 2:]
        except Exception as e:
            pass

        # this returns a tuple of the file name/path that was used and the new command string
        print("returned output_path: {}, compile_command: {}".format(output_file_location, compile_command))
        return {"output_path": output_file_location, "command": compile_command}

    async def preprocessFilePaths(self, payload: Payload, prior_output: FilePath, compile_command_with_tokens: str) -> Dict[str, str]:
        # {{input}} will be replaced by our input file path that we selected or created
        # {{output/filename}} will have output replaced by the proper directory and the new path saved off
        print("called preprocessFilePaths with prior_output: {}, and compile_command_with_tokens: {}".format(prior_output, compile_command_with_tokens))
        input_file_location = ""
        output_file_location = ""
        if prior_output is not None and prior_output != "":
            input_file_location = prior_output
        else:
            # if the user doesn't care, we'll put them both in a temporary location where the payload was created
            input_file_location = payload.location
        compile_command = compile_command_with_tokens.replace("{{input}}", input_file_location)
        # now we need to get our final output name from here
        try:
            index = compile_command.index("{{output/")  # if it's not found it'll get an exception and we move on
            end_index = compile_command.index("}}")
            output_file_location = os.path.dirname(input_file_location) + "/" + compile_command[index+9:end_index]
            compile_command = compile_command[:index] + output_file_location + compile_command[end_index+2:]
        except Exception as e:
            pass

        # this returns a tuple of the file name/path that was used and the new command string
        print("returned output_path: {}, compile_command: {}".format(output_file_location, compile_command))
        return {"output_path": output_file_location, "command": compile_command}

    async def writeFile(self, payload: Payload, prior_output: bytearray, file_path_or_default: FilePath) -> FilePath:
        if file_path_or_default == "":
            # this means we don't have a specific output and our code to write should be in prior_output
            # if we don't specify a name, we'll default to ./app/payloads/{operation}/load-{timestamp}
            output_path = FilePath("./app/payloads/operations/{}/load-{}".format(payload.operation.name, datetime.datetime.utcnow()))
        else:
            # we will indicate {{output}}/parameter as the final location and name for the file
            output_path = file_path_or_default
        file = open(output_path, 'wb')
        file.write(prior_output)
        file.close()
        return output_path

    async def selectFile(self, payload: Payload, prior_output: List[FilePath], static_file_path_to_use: FilePath) -> FilePath:
        return static_file_path_to_use

    async def readFileToBytearray(self, payload: Payload, prior_output: None, file_path: FilePath) -> bytearray:
        return bytearray(open(file_path, 'rb').read())

    async def convertBytesToString(self, payload: Payload, prior_output: bytearray, parameter: None) -> str:
        return prior_output.decode("utf-8")

    async def removeSlashes(self, payload: Payload, prior_output: str, parameter: None) -> str:
        return re.sub(r'\\\\', r'\\', prior_output)

    async def escapeSlashes(self, payload: Payload, prior_output: str, parameter: None) -> str:
        return re.sub(r'\\', r'\\\\', prior_output)

    async def strToByteArray(self, payload: Payload, prior_output: str, parameter: None) -> bytearray:
        return bytearray(prior_output.encode('utf-8'))
