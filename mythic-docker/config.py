
from dynaconf import Dynaconf

settings = Dynaconf(
    envvar_prefix="MYTHIC",
)

# `envvar_prefix` = export envvars with `export MYTHIC_FOO=bar`.
# `settings_files` = Load this files in the order.
