FROM node:20-alpine

WORKDIR /app

COPY . .

# ==== BUILD =====
# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
#RUN npm install --legacy-peer-deps
RUN npm ci --legacy-peer-deps

# ==== RUN =====
CMD CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true FAST_REFRESH=true WDS_POLLING=true npm run react-start