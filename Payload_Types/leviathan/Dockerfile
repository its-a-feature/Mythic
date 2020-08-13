From itsafeaturemythic/python36_payload:0.0.5

RUN apt-get update
RUN apt-get install software-properties-common apt-utils -y
RUN apt-get -y install git
RUN git clone https://github.com/xorrior/CRX3-Creator.git /CRX3-Creator
RUN cd /CRX3-Creator; pip install -r requirements.txt;
