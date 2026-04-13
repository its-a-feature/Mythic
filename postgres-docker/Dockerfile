FROM postgres:15-alpine
COPY ["pg_hba.conf", "/var/lib/postgresql/pg_hba.conf"]
COPY ["configuration.sh", "/docker-entrypoint-initdb.d/configuration.sh"]
COPY ["postgres.conf", "/etc/postgresql.conf"]

HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=5s \
  CMD pg_isready -d ${POSTGRES_DB:-mythic_db} -U ${POSTGRES_USER:-mythic_user} -p ${POSTGRES_PORT:-5432} || exit 1