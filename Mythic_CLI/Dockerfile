#FROM itsafeaturemythic/mythic_base_image:0.0.2
FROM itsafeaturemythic/mythic_base:latest

WORKDIR /usr/src/app

COPY ["src/", "."]

CMD ["/bin/bash", "-c", "make", "build"]