# Angular Dockerfile
FROM node:20.19.1-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --prod

# Serve with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]
