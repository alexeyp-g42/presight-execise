FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
COPY client/package.json client/
COPY server/package.json server/

FROM base AS build
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY . .
RUN yarn --cwd server build && yarn --cwd client build

FROM base AS deps
RUN yarn install --frozen-lockfile --production --network-timeout 600000 \
  && mkdir -p server/node_modules

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/data/users.db \
    STATIC_DIR=/app/client/dist
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3001
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server/dist/index.js"]
