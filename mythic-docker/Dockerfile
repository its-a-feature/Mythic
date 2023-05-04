#FROM itsafeaturemythic/mythic_base_image:0.0.2
FROM itsafeaturemythic/mythic_base:latest

WORKDIR /usr/src/app

COPY ["src/", "."]

RUN make build_final

CMD ["/bin/bash", "-c", "cp /mythic_server . && ./mythic_server" ]