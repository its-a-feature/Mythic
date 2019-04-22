From python:3.6-jessie
RUN mkdir -p /Apfell/app/
COPY app/ /Apfell/app/
COPY requirements.txt /Apfell/requirements.txt
COPY server.py /Apfell/server.py

COPY wait-for-postgres.sh /Apfell/wait-for-postgres.sh
#RUN chmod 777 /Apfell/wait-for-postgres.sh
#VOLUME ["/Apfell"]
WORKDIR /Apfell
RUN pip install -r requirements.txt
