FROM node:20-alpine

WORKDIR /app

COPY . .

# ==== BUILD =====
# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
RUN npm install --legacy-peer-deps
#RUN npm ci

# ==== RUN =====
CMD npm run react-start