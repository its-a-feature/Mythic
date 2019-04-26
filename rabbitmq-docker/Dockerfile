FROM rabbitmq:3.6.6-management

ADD init.sh /
ADD config_rabbit.sh /
RUN chmod +x /init.sh /config_rabbit.sh

ENTRYPOINT ["/init.sh"]
