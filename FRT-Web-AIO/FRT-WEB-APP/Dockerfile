# Build stage
FROM node:20.14.0 as build
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Install envsubst
RUN apk add --no-cache gettext

# Expose port 80
EXPOSE 80

# Use shell form of CMD to use environment variable substitution
CMD ["/bin/sh", "-c", "envsubst '$VITE_USERS_SERVICE_URL $VITE_TEAMS_SERVICE_URL $VITE_MAPS_SERVICE_URL $VITE_MISSIONS_SERVICE_URL $VITE_MESSENGER_SERVICE_URL $VITE_BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
