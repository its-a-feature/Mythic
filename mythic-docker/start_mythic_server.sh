POSTGRES_SOCKET="${POSTGRES_HOST}:${POSTGRES_PORT}"

./wait-for-it.sh $POSTGRES_SOCKET -q -s -t 30 -- echo "Postgres is listening at ${POSTGRES_SOCKET}"
if [[ $? -ne 0 ]]
then
    echo "Unable to connect the Postgres database at ${POSTGRES_SOCKET}"
    exit 1
fi

python /Mythic/server.py