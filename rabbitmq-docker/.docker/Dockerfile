FROM rabbitmq:3-management-alpine
ADD rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
ADD generate_config.sh /generate_config.sh
ADD rabbitmq.conf /tmp/base_rabbitmq.conf

HEALTHCHECK --interval=60s --timeout=30s --retries=5 --start-period=20s \
  CMD rabbitmq-diagnostics -q check_port_connectivity || exit 1

CMD /bin/sh -c "chmod +x /generate_config.sh && /generate_config.sh && rabbitmq-server"