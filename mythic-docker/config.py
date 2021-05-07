
from dynaconf import Dynaconf

settings = Dynaconf(
    envvar_prefix="MYTHIC",
    settings_files=['config.json'],
)

# `envvar_prefix` = export envvars with `export MYTHIC_FOO=bar`.
# `settings_files` = Load this files in the order.
