FROM hasura/graphql-engine:latest.cli-migrations-v2
ENV HASURA_GRAPHQL_SERVER_PORT=8080
HEALTHCHECK CMD curl -f http://localhost:${HASURA_GRAPHQL_SERVER_PORT}/healthz || exit 1
COPY ["metadata/", "/metadata"]