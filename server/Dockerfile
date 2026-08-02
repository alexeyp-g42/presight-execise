# SQLite comes from Node's built-in `node:sqlite`, so there is no native module
# to compile and the image needs no build toolchain at all.
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json yarn.lock lerna.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN yarn install --frozen-lockfile

COPY server ./server
RUN yarn workspace presight-server build


FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning \
    DATABASE_PATH=/data/app.db \
    PORT=4000

# Production dependencies only — the build tooling stays in the builder stage.
COPY package.json yarn.lock lerna.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/server/dist ./server/dist
COPY server/docker-entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /data \
    && chown -R node:node /data

USER node
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
