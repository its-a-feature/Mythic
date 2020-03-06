From karalabe/xgo-latest
RUN apt-get update
RUN apt-get install software-properties-common apt-utils -y
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update
RUN apt-get install -y build-essential python3.6 python3-pip
RUN alias python3=python3.6
RUN python3.6 -m pip install aio_pika

RUN mkdir /Apfell_service 2>/dev/null
RUN mkdir /Apfell 2>/dev/null
RUN mkdir /Apfell/apfell 2>/dev/null
RUN touch /Apfell/apfell/__init__.py 2>/dev/null
RUN touch /Apfell/__init__.py 2>/dev/null
COPY ["apfell_heartbeat.py", "/Apfell_service/apfell_heartbeat.py"]
COPY ["apfell_service.py", "/Apfell_service/apfell_service.py"]
COPY ["rabbitmq_config.json", "/Apfell_service/rabbitmq_config.json"]
COPY ["payload_service.sh", "/Apfell_service/payload_service.sh"]
RUN chmod +x /Apfell_service/payload_service.sh
WORKDIR /Apfell_service/
RUN /build.sh &
ENTRYPOINT ["/Apfell_service/payload_service.sh"]

