From python:3.6-jessie
RUN pip install aio_pika
RUN pip install pika
RUN mkdir /Apfell_service
RUN mkdir /Apfell
COPY ["apfell_heartbeat.py", "/Apfell_service/apfell_heartbeat.py"]
COPY ["apfell_service.py", "/Apfell_service/apfell_service.py"]

COPY ["c2_service.sh", "/Apfell_service/c2_service.sh"]
RUN chmod +x /Apfell_service/c2_service.sh
WORKDIR /Apfell/
ENTRYPOINT ["/Apfell_service/c2_service.sh"]
