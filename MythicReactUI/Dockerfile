FROM node:19-alpine

WORKDIR /app

COPY . .

# ==== BUILD =====
# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
RUN npm ci

# ==== RUN =====
CMD npm run react-start