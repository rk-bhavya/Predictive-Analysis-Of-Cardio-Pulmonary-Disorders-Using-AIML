# Stage 1 — Build React app
FROM node:18-bullseye AS build

# Set working directory inside container
WORKDIR /app

# Copy package files first (for efficient Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the client source code
COPY . .

# Build the optimized production bundle
RUN npm run build

# Stage 2 — Serve the React app with a lightweight web server
FROM nginx:alpine

# Copy the build output to Nginx's default public directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 3000 (or 80 if you want it on HTTP directly)
EXPOSE 3000

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
