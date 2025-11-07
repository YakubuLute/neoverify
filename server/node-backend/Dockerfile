FROM node:18
WORKDIR /usr/src/app

# Install dependencies
COPY server/node-backend/package*.json ./
RUN npm install

# Copy source
COPY server/node-backend/ .

# Expose app
EXPOSE 5000
CMD ["npm", "start"]
