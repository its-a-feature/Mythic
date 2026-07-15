# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:24-alpine AS ui-build

WORKDIR /app

COPY ["MythicReactUI/package.json", "MythicReactUI/package-lock.json", "./"]
RUN npm ci --legacy-peer-deps

COPY ["MythicReactUI/config-overrides.js", "MythicReactUI/.env", "./"]
COPY ["MythicReactUI/public/", "./public/"]
COPY ["MythicReactUI/src/", "./src/"]

RUN npm run react-build

FROM nginx:1.25-alpine
COPY ["mythic-react-docker/config/", "/etc/nginx"]
COPY --from=ui-build /app/build/ /mythic/new/

HEALTHCHECK --interval=30s --timeout=60s --retries=5 --start-period=20s \
  CMD wget -SqO - http://127.0.0.1:${MYTHIC_REACT_PORT:-3000}/new || exit 1
