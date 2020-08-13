From python:3.6-jessie
RUN mkdir -p /Mythic/app/
COPY app/ /Mythic/app/
COPY requirements.txt /Mythic/requirements.txt
COPY server.py /Mythic/server.py

COPY wait-for-postgres.sh /Mythic/wait-for-postgres.sh
WORKDIR /Mythic
RUN pip install -r requirements.txt
