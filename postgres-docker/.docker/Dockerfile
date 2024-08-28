FROM postgres:15-alpine
COPY ["pg_hba.conf", "/var/lib/postgresql/pg_hba.conf"]
COPY ["configuration.sh", "/docker-entrypoint-initdb.d/configuration.sh"]
COPY ["postgres.conf", "/etc/postgresql.conf"]

HEALTHCHECK --interval=30s --timeout=30s --retries=5 --start-period=20s \
  CMD pg_isready -d mythic_db -U mythic_user || exit 1