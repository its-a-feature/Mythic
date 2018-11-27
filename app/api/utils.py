import re
import base64
import os
import asyncio
import datetime
from app.database_models.model import Payload, PayloadType, Command
from typing import List, Dict, Tuple, NewType
import subprocess

FilePath = NewType('FilePath', str)


async def breakout_quoted_params(input):
    # return an array of the broken out params as if they were on the command line
    # or return an error
    regex = re.compile(r'((?<![\\])[\'"])((?:.(?!(?<![\\])\1))*.?)\1')
    potential_groups = regex.findall(input)
    return [x[1] for x in potential_groups]


class TransformOperation:
    # at the end of your transform sequence, just have the final return be the path of the file that should be served up
    # regardless of what you name your parameters, will always be passed in:
    #    payload, prior_output, parameter field

    async def readCommands(self, payload: Payload, prior_output: List[FilePath], parameter: None) -> List[bytes]:
        files = []
        for p in prior_output:
            files.append(open(p, 'rb').read())
        return files

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
        cmd = compile_command.split(" ")
        null = open("/dev/null", 'w')
        subprocess.Popen(cmd, stdout=null, stderr=null, stdin=null)
        # we return the status (in case that's something you want to print out) and where the new file is located
        return FilePath(prior_output)

    async def preprocessCompile(self, payload: Payload, prior_output: Dict[str, str], parameter: None) -> str:
        # just parse the input dictionary and call the original compile to reduce redundant code
        return await self.compile(payload, FilePath(prior_output['output_path']), prior_output['command'])

    async def preprocessFilePaths(self, payload: Payload, prior_output: FilePath, compile_command_with_tokens: str) -> Dict[str, str]:
        # {{input}} will be replaced by our input file path that we selected or created
        # {{output/filename}} will have output replaced by the proper directory and the new path saved off
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

    async def createTuple(self, payload: Payload, prior_output, parameter: str) -> Tuple:
        return prior_output, parameter

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
