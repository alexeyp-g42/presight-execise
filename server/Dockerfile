FROM node:24-bookworm-slim

WORKDIR /app

# Install native build dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       make \
       g++ \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js headers are present
RUN test -f /usr/local/include/node/node.h

# Tell node-gyp to use local Node.js headers
# Avoid downloading headers over HTTPS
ENV npm_package_config_node_gyp_nodedir=/usr/local

# Copy npm workspace manifests
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install only production backend dependencies
RUN npm ci --workspace=server --include-workspace-root=false --omit=dev

# Copy backend source
COPY server/ ./server/

# Prepare SQLite directory
RUN mkdir -p /app/server/data \
    && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/server/data/users.sqlite

EXPOSE 3001

CMD ["node", "server/src/index.js"]