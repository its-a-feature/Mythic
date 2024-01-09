FROM node:20-alpine

WORKDIR /app

COPY . .

# ==== BUILD =====
# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
#RUN npm install --legacy-peer-deps
RUN npm ci --legacy-peer-deps
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV FAST_REFRESH=true
ENV WDS_POLLING=true
ENV WDS_SOCKET_PATH=ws
# ==== RUN =====
CMD CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true FAST_REFRESH=true WDS_POLLING=true WDS_SOCKET_PATH=ws npm run react-start