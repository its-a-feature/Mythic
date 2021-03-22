./wait-for-postgres.sh -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -q -s -t 30 -- echo "Postgres is listening at ${POSTGRES_SOCKET}"
if [[ $? -ne 0 ]]
then
    echo "Unable to connect the Postgres database at $POSTGRES_HOST with port $POSTGRES_PORT"
    exit 1
fi

python3.8 /Mythic/server.py