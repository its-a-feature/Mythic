From payload_type_base
RUN apt-get update
RUN apt-get install software-properties-common apt-utils -y
RUN apt-get -y install git
RUN git clone https://github.com/xorrior/CRX3-Creator.git /CRX3-Creator
RUN apt-get install python-minimal -y
RUN apt-get install python-pip -y
RUN cd /CRX3-Creator; pip install -r requirements.txt;
