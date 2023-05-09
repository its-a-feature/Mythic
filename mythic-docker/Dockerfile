FROM itsafeaturemythic/mythic_go_base:latest

WORKDIR /usr/src/app

COPY ["src/", "."]

RUN make build_final

FROM alpine

COPY --from=0 /mythic_server /mythic_server

WORKDIR /usr/src/app

CMD ["/bin/sh", "-c", "cp /mythic_server . && ./mythic_server" ]