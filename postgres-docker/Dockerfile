From itsafeaturemythic/mythic_postgres:0.0.2
COPY ["pg_hba.conf", "/var/lib/postgresql/pg_hba.conf"]
COPY ["postgres.conf", "/var/lib/postgresql/postgresql.conf"]
COPY ["configuration.sh", "/docker-entrypoint-initdb.d/configuration.sh"]

## To enable detailed logging:
### get the current password: sudo ./mythic-cli config get postgres_password
### connect to the container: sudo docker exec -it mythic_postgres /bin/bash
### connect to the database: psql -U mythic_user mythic_db
#### ^ this command will prompt you for the mythic_user creds from the first command
### enable the extension: CREATE EXTENSION pg_stat_statements;
### let the database run for a bit to collect stats
### view the stats: select calls, total_exec_time, query from pg_stat_statements order by calls desc;