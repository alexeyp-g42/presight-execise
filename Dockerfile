# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:26-slim
ARG PNPM_VERSION=11.8.0

# ---------------------------------------------------------------------------
# base: pin pnpm via corepack so builds are reproducible (no floating version)
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
WORKDIR /app
# corepack ships separately from Node 25+, install it explicitly before using it.
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate



# ---------------------------------------------------------------------------
# app-build: build schema, client and server, then produce a self-contained
# prod-only deploy of the server (dist + prod node_modules, no monorepo needed)
# ---------------------------------------------------------------------------

FROM base AS app-build

# Deliberately no VITE_* build args: the client calls the API at the relative path /api, which
# nginx proxies. Nothing about the deployment is compiled into the bundle, so this image is
# identical for every environment and the API address stays a runtime setting.

COPY . .

RUN pnpm install --frozen-lockfile

# Build through nx so the image uses the same task graph as local development: nx.json declares
# build.dependsOn = ["^build"], so asking for the client also builds @presight/schema first, in
# the right order. No daemon in a container — it only adds a background process and a socket.
ENV NX_DAEMON=false
RUN pnpm exec nx build @presight/client

RUN pnpm --filter=@presight/server --prod deploy /presight-exercise-server

# The sqlite database is never copied from the host, it is built here from the
# committed user_data.csv so the image always carries a known-good dataset.
RUN cd /presight-exercise-server && pnpm run init:prod

# ---------------------------------------------------------------------------
# client: static assets served by nginx
# ---------------------------------------------------------------------------

FROM nginx:alpine AS pseclient

COPY --from=app-build /app/apps/client/dist /usr/share/nginx/html

# Our server block replaces the stock one: it listens on 8086 and proxies /api to the API
# container, which keeps the browser same-origin and removes the need for CORS entirely.
RUN rm /etc/nginx/conf.d/default.conf
COPY apps/client/nginx.conf.template /etc/nginx/templates/default.conf.template

# Where the API lives, resolved when the container starts rather than when the image is built.
# The filter restricts envsubst to this one name so nginx's own $variables are left alone.
ENV API_UPSTREAM=server:3030
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$


EXPOSE 8086

CMD ["nginx", "-g", "daemon off;"]

# ---------------------------------------------------------------------------
# server: run the esbuild-bundled output with its deployed prod node_modules
# ---------------------------------------------------------------------------

FROM ${NODE_IMAGE} AS pseserver

WORKDIR /app
COPY --from=app-build /presight-exercise-server ./

# Single source for the port the API listens on inside the container. ENV feeds the server (see
# apps/server/src/env.ts) and EXPOSE records it as image metadata, so the two cannot drift.
# Still overridable at run time with `-e PORT=...`; the build arg only changes the default.
ARG SERVER_PORT=3030
ENV NODE_ENV=production
ENV PORT=${SERVER_PORT}

EXPOSE ${SERVER_PORT}

CMD ["node", "src/index.ts"]
