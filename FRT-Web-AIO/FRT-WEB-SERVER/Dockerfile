# Build stage
FROM node:20.14.0 AS build
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application and preserve logs if it fails
RUN npm run build || (cat /root/.npm/_logs/*-debug.log && exit 1)

EXPOSE 3001

# Run the server
CMD ["node", "dist/server.js"]