./wait-for-postgres.sh -h "$MYTHIC_POSTGRES_HOST" -p "$MYTHIC_POSTGRES_PORT" -q -s -t 30 -- echo "Postgres is listening at ${MYTHIC_POSTGRES_PORT}"
if [[ $? -ne 0 ]]
then
    echo "Unable to connect the Postgres database at $MYTHIC_POSTGRES_HOST with port $MYTHIC_POSTGRES_PORT"
    exit 1
fi
./wait-for-postgres.sh -h "127.0.0.1" -p $MYTHIC_REDIS_PORT -q -s -t 30 -- echo "Redis is listening"
if [[ $? -ne 0 ]]
then
    echo "Unable to connect the Redis database at 127.0.0.1 with port $MYTHIC_REDIS_PORT"
    exit 1
fi
python3.8 /Mythic/server.py