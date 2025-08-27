FROM nginx:1.25-alpine
COPY error403.html /usr/share/nginx/html/
COPY ["config/", "/etc/nginx"]
COPY ["health_check.sh", "/health_check.sh"]
RUN chmod +x /health_check.sh
RUN apk add openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/mythic-ssl.key -out /etc/ssl/private/mythic-cert.crt -sha256 -days 3650 -nodes -subj "/O=Mythic/OU=Mythic/CN=Mythic"

HEALTHCHECK --interval=30s --timeout=60s --retries=5 --start-period=20s \
  CMD /health_check.sh || exit 1