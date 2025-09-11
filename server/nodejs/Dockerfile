FROM node:18
WORKDIR /usr/src/app

# Install dependencies
COPY server/nodejs/package*.json ./
RUN npm install

# Copy source
COPY server/nodejs/ .

# Expose app
EXPOSE 5000
CMD ["npm", "start"]
