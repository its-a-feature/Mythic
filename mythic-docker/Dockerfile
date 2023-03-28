FROM itsafeaturemythic/mythic_base_image:0.0.2

WORKDIR /usr/src/app

COPY ["src/", "."]

#RUN go mod download && go mod verify

RUN make build_final

CMD ["/bin/bash", "-c", "cp /mythic_server . && ./mythic_server" ]