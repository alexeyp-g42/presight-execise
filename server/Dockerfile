# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /repo
COPY package.json yarn.lock lerna.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN corepack enable && yarn install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/client/node_modules ./client/node_modules
COPY --from=deps /repo/server/node_modules ./server/node_modules
COPY package.json yarn.lock lerna.json tsconfig.base.json ./
COPY shared ./shared
COPY server ./server
RUN corepack enable && yarn workspace presight-server build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/users.db
COPY --from=build /repo/server/dist ./dist
COPY --from=build /repo/node_modules /app/node_modules
RUN mkdir -p /data
EXPOSE 3001
CMD ["node", "dist/server/src/main.js"]
