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
