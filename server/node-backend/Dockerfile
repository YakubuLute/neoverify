# =============================================
# Node Backend - Development Dockerfile
# =============================================

FROM node:20.19.1-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for dependency install)
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy the rest of your code
COPY . .

# Expose backend port 
EXPOSE 3000

# Run development mode with hot reload
CMD ["npm", "run", "dev"]
