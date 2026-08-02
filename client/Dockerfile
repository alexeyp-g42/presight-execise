FROM node:22-slim AS builder
WORKDIR /app

COPY package.json yarn.lock lerna.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN yarn install --frozen-lockfile

COPY client ./client
# The client imports the API contract from the server package through a Vite
# alias, so those sources must be present at build time. Types and constants
# only — nothing from the server ends up in the bundle.
COPY server/src/shared ./server/src/shared

RUN yarn workspace presight-client build


FROM nginx:alpine AS runtime
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
