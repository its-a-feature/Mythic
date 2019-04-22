From python:3.6-jessie
RUN pip install aio_pika
RUN pip install pika
RUN mkdir /Apfell_service
RUN mkdir /Apfell
RUN mkdir /Apfell/apfell
RUN touch /Apfell/apfell/__init__.py
RUN touch /Apfell/__init__.py
COPY ["apfell_heartbeat.py", "/Apfell_service/apfell_heartbeat.py"]
COPY ["apfell_service.py", "/Apfell_service/apfell_service.py"]

COPY ["payload_service.sh", "/Apfell_service/payload_service.sh"]
RUN chmod +x /Apfell_service/payload_service.sh
WORKDIR /Apfell/
ENTRYPOINT ["/Apfell_service/payload_service.sh"]
