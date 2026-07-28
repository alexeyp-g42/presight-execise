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
COPY package.json yarn.lock lerna.json tsconfig.base.json ./
COPY shared ./shared
COPY client ./client
RUN corepack enable && yarn workspace presight-client build

FROM nginx:1.27-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/client/dist /usr/share/nginx/html
EXPOSE 80
