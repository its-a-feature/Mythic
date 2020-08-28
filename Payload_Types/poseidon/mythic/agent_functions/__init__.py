import glob
from os.path import basename

# Get file paths of all modules.
modules = glob.glob("agent_functions/*.py")
__all__ = [basename(x)[:-3] for x in modules if x != "__init__.py"]
