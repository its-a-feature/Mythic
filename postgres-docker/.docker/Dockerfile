FROM postgres:15-alpine
COPY ["pg_hba.conf", "/var/lib/postgresql/pg_hba.conf"]
COPY ["configuration.sh", "/docker-entrypoint-initdb.d/configuration.sh"]
COPY ["postgres.conf", "/etc/postgres.conf"]

HEALTHCHECK --interval=30s --timeout=30s --retries=5 --start-period=20s \
  CMD pg_isready -d mythic_db -p ${POSTGRES_PORT} -U mythic_user || exit 1

CMD postgres -c "max_connections=100" -p ${POSTGRES_PORT} -c config_file=/etc/postgres.conf