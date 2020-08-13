From python:3.6-jessie
RUN pip install aio_pika

RUN mkdir /Mythic_service 2>/dev/null
COPY ["c2_service.sh", "/Mythic_service/c2_service.sh"]
RUN chmod +x /Mythic_service/c2_service.sh
WORKDIR /Mythic_service/

ENTRYPOINT ["/Mythic_service/c2_service.sh"]
