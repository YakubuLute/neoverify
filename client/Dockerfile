# Angular dev server Dockerfile
FROM node:20.18.0-alpine3.20 AS base

WORKDIR /app

# Environment for better DX in containers
ENV NG_CLI_ANALYTICS=ci \
    CHOKIDAR_USEPOLLING=true \
    HOST=0.0.0.0 \
    PORT=4200

# Install dependencies first (leverage Docker layer cache)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source
COPY . .

EXPOSE 4200

# Use npx to avoid needing a global @angular/cli
# Bind to 0.0.0.0 so the service is reachable from outside the container
# Use polling for file change detection inside Docker
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]
