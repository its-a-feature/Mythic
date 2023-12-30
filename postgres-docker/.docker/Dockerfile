FROM postgres:15-alpine
COPY ["pg_hba.conf", "/var/lib/postgresql/pg_hba.conf"]
COPY ["configuration.sh", "/docker-entrypoint-initdb.d/configuration.sh"]
COPY ["postgres.conf", "/etc/postgres.conf"]