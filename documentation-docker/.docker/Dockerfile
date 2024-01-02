FROM klakegg/hugo:latest

COPY [".", "/src/"]
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=10s \
  CMD wget -nv -t1 -O /dev/null http://127.0.0.1:${DOCUMENTATION_PORT:-8090}/docs/ || exit 1

RUN hugo new site mythic_docs

ENTRYPOINT hugo server -p ${DOCUMENTATION_PORT:-8090}