FROM nginx:1.25-alpine
COPY error403.html /usr/share/nginx/html/
COPY ["config/", "/etc/nginx"]
COPY ["ssl/", "/etc/ssl/private/"]
COPY ["health_check.sh", "/health_check.sh"]
RUN chmod +x /health_check.sh

HEALTHCHECK --interval=30s --timeout=60s --retries=5 --start-period=20s \
  CMD /health_check.sh || exit 1