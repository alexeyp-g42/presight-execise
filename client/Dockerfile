
# Stage 1: Build React application
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Copy workspace dependency manifests
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci --workspace=client --include-workspace-root=false

# Copy frontend source
COPY client/ ./client/

# Use Nginx /api proxy instead of a direct backend URL
ENV VITE_API_BASE_URL=""

RUN npm run build -w client


# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder \
    /app/client/dist \
    /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
