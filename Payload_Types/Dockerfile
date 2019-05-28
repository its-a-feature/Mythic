From python:3.6-jessie
RUN pip install aio_pika

RUN mkdir /Apfell_service 2>/dev/null
RUN mkdir /Apfell 2>/dev/null
RUN mkdir /Apfell/apfell 2>/dev/null
RUN touch /Apfell/apfell/__init__.py 2>/dev/null
RUN touch /Apfell/__init__.py 2>/dev/null
COPY ["apfell_heartbeat.py", "/Apfell_service/apfell_heartbeat.py"]
COPY ["apfell_service.py", "/Apfell_service/apfell_service.py"]

COPY ["payload_service.sh", "/Apfell_service/payload_service.sh"]
RUN chmod +x /Apfell_service/payload_service.sh
WORKDIR /Apfell/
ENTRYPOINT ["/Apfell_service/payload_service.sh"]
