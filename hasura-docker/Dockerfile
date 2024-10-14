#FROM hasura/graphql-engine:v2.1.1.cli-migrations-v2
#From hasura/graphql-engine:v2.0.3.cli-migrations-v2
#From hasura/graphql-engine:v2.0.0-alpha.9.cli-migrations-v2
#From hasura/graphql-engine:v1.3.4-beta.2.cli-migrations-v2
#FROM hasura/graphql-engine:v2.9.0-beta.1.cli-migrations-v2
#FROM hasura/graphql-engine:v2.19.0.cli-migrations-v2
#FROM hasura/graphql-engine:latest.cli-migrations-v2
#FROM ghcr.io/its-a-feature/mythic_graphql:v0.0.3.8
FROM hasura/graphql-engine:latest.cli-migrations-v2
ENV HASURA_GRAPHQL_SERVER_PORT=8080
HEALTHCHECK CMD curl -f http://localhost:${HASURA_GRAPHQL_SERVER_PORT}/healthz || exit 1
COPY ["metadata/", "/metadata"]