#! /usr/env python3

import sys
import pathlib
from importlib import import_module
from CommandBase import *
from PayloadBuilder import *


def import_all_agent_functions():
    import glob

    # Get file paths of all modules.
    modules = glob.glob("agent_functions/*.py")
    for x in modules:
        if not x.endswith("__init__.py") and x[-3:] == ".py":
            module = import_module("agent_functions." + pathlib.Path(x).stem)
            for el in dir(module):
                if "__" not in el:
                    globals()[el] = getattr(module, el)


root = pathlib.Path(".")
import_all_agent_functions()
commands = []
payload_type = {}
for cls in PayloadType.__subclasses__():
    payload_type = cls(agent_code_path=root).to_json()
    break
for cls in CommandBase.__subclasses__():
    commands.append(cls(root).to_json())
payload_type["commands"] = commands

# now generate the docs
root_home = root / payload_type["ptype"]
if not root_home.exists():
    root_home.mkdir()
if not (root_home / "c2_profiles").exists():
    (root_home / "c2_profiles").mkdir()
if not (root_home / "commands").exists():
    (root_home / "commands").mkdir()
# now to generate files
with open(root_home / "_index.md", "w") as f:
    f.write(
        f"""+++
title = "{payload_type['ptype']}"
chapter = false
weight = 5
+++

## Summary

Overview

### Highlighted Agent Features
list of info here

## Authors
list of authors

### Special Thanks to These Contributors
list of contributors
"""
    )
with open(root_home / "c2_profiles" / "_index.md", "w") as f:
    f.write(
        f"""+++
title = "C2 Profiles"
chapter = true
weight = 25
pre = "<b>4. </b>"
+++

# Supported C2 Profiles

This section goes into any `{payload_type['ptype']}` specifics for the supported C2 profiles.
"""
    )
with open(root_home / "development.md", "w") as f:
    f.write(
        f"""+++
title = "Development"
chapter = false
weight = 20
pre = "<b>3. </b>"
+++

## Development Environment

Info for ideal dev environment or requirements to set up environment here

## Adding Commands

Info for how to add commands
- Where code for commands is located
- Any classes to call out

## Adding C2 Profiles

Info for how to add c2 profiles
- Where code for editing/adding c2 profiles is located
"""
    )
with open(root_home / "opsec.md", "w") as f:
    f.write(
        f"""+++
title = "OPSEC"
chapter = false
weight = 10
pre = "<b>1. </b>"
+++

## Considerations
Info here

### Post-Exploitation Jobs
Info here

### Remote Process Injection
Info here

### Process Execution
Info here"""
    )
with open(root_home / "commands" / "_index.md", "w") as f:
    f.write(
        f"""+++
title = "Commands"
chapter = true
weight = 15
pre = "<b>2. </b>"
+++

# {payload_type['ptype']} Command Reference
These pages provide in-depth documentation and code samples for the `{payload_type['ptype']}` commands.
"""
    )
payload_type["commands"] = sorted(payload_type["commands"], key=lambda i: i["cmd"])
for i in range(len(payload_type["commands"])):
    c = payload_type["commands"][i]
    cmd_file = c["cmd"] + ".md"
    with open(root_home / "commands" / cmd_file, "w") as f:
        f.write(
            f"""+++
title = "{c['cmd']}"
chapter = false
weight = 100
hidden = false
+++

## Summary

{c['description']} 
- Needs Admin: {c['needs_admin']}  
- Version: {c['version']}  
- Author: {c['author']}  

### Arguments

"""
        )
        for a in c["parameters"]:
            f.write(
                f"""#### {a['name']}

- Description: {a['description']}  
- Required Value: {a['required']}  
- Default Value: {a['default_value']}  

"""
            )
        f.write(
            f"""## Usage

```
{c['help_cmd']}
```

"""
        )
        if len(c["attack"]) > 0:
            f.write(
                f"""## MITRE ATT&CK Mapping
"""
            )
            for a in c["attack"]:
                f.write(
                    f"""
- {a['t_num']}  """
                )

        f.write(
            f"""
## Detailed Summary

"""
        )
