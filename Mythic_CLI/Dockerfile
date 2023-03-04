FROM itsafeaturemythic/mythic_base_image:0.0.1

WORKDIR /usr/src/app

COPY ["src/", "."]

RUN go get -u github.com/MythicMeta/MythicContainer

RUN go mod download && go mod verify

CMD ["/bin/bash", "-c", "make", "build"]