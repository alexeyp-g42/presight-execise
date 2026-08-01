# syntax=docker/dockerfile:1

ARG NODE_VERSION=24
ARG PNPM_VERSION=11.18.0
# trixie, not the `node:24-slim` default of bookworm. The Debian release is
# pinned for the same reason the base is slim rather than alpine: it is what
# makes `better-sqlite3`'s prebuilt binary load. The package ships one per
# platform and its loader prefers it over anything node-gyp produces, but the
# Linux build is linked against glibc 2.38 — bookworm ships 2.36, so the
# default tag starts, opens the database and dies on `libm.so.6: version
# GLIBC_2.38 not found`. The alternative is a `python3 make g++` stage to
# compile a binary the loader would then ignore.
ARG DEBIAN_RELEASE=trixie

# ------------------------------------------------------------------- base
# slim, not alpine: glibc, so the prebuild resolves at all — the musl build is
# a different file and alpine would need it.
FROM node:${NODE_VERSION}-${DEBIAN_RELEASE}-slim AS base
ARG PNPM_VERSION
ENV CI=true
# `npm i -g`, not corepack: corepack is on its way out of Node, and this pins
# the same version `packageManager` does with nothing to enable at runtime.
RUN npm i -g pnpm@${PNPM_VERSION}
WORKDIR /app

# ------------------------------------------------------------------- deps
# Manifests and the lockfile only, so this layer survives every source-only
# change. A pnpm workspace cannot be installed one package at a time, so all
# three manifests come along — they are the layer's cache key, nothing more.
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json client/
COPY server/package.json server/
COPY packages/shared/package.json packages/shared/
# `--frozen-lockfile`, the flag CI's install uses, so the two cannot drift: a
# lockfile out of sync with any manifest is a red build rather than a silently
# different image.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# -------------------------------------------------------------- prod-deps
# The runtime dependency graph on its own. Independent of `deps`, so BuildKit
# runs the two concurrently against the same store cache and the second install
# is almost entirely linking.
#
# `--filter server...` — the server and the workspace packages it depends on —
# on top of `--prod`, because the two prune different things. `--prod` drops
# devDependencies; the filter drops the client, whose dependencies Vite has
# already bundled into `client/dist` and which therefore has no runtime graph
# in this image at all. Without it react, axios and tailwind ship for nothing —
# and `vite` itself lands in the image, pulled in as an auto-installed peer of
# `@tailwindcss/vite`, which is a client *dependency* rather than a dev one.
#
# All three manifests are still copied: `--frozen-lockfile` verifies the
# lockfile against every workspace manifest, filtered install or not.
FROM base AS prod-deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json client/
COPY server/package.json server/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter server...

# ------------------------------------------------------------------ build
FROM deps AS build
COPY . .
RUN pnpm -r run build

# ---------------------------------------------------------------- runtime
# A clean base rather than a stage that ever held them: no pnpm, no dev
# dependencies, no build toolchain. vite, typescript, eslint, vitest and
# drizzle-kit cannot reach this image because the only `node_modules` it copies
# is the one `--prod` produced.
FROM node:${NODE_VERSION}-${DEBIAN_RELEASE}-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/presight.sqlite \
    SEED_ON_BOOT=auto

WORKDIR /app/server

# pnpm writes RELATIVE symlinks into the virtual store, and this stage keeps the
# same `/app` + `/app/server` layout, so the farm resolves after the copy.
COPY --from=prod-deps --chown=node:node /app/node_modules        /app/node_modules
COPY --from=prod-deps --chown=node:node /app/server/node_modules /app/server/node_modules

# The contract package, at the realpath `server/node_modules/@presight/shared`
# points to. It ships as `.ts` source, and Node refuses to strip types under
# `node_modules` — so it only works from out here, which is also why `pnpm
# deploy --legacy` is prohibited: it flattens workspace deps into real
# directories inside `node_modules` and walks straight into
# ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING.
COPY --from=build --chown=node:node /app/packages/shared /app/packages/shared

COPY --from=build --chown=node:node /app/server/dist ./dist
# `migrate()` reads `<package>/drizzle` on every boot. The committed SQL is not
# compiled into `dist`, so without this the container migrates nothing and the
# seed fails on a missing table.
COPY --from=build --chown=node:node /app/server/drizzle ./drizzle
# Where `serveClient()` looks. Same origin as the API, one port, no CORS.
COPY --from=build --chown=node:node /app/client/dist ./public

# `--chmod`, so the file mode git happens to carry is not part of the contract.
COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Must happen before `USER`: a fresh named volume inherits the ownership of the
# directory it mounts over, so without this the non-root process cannot create
# the database file. The volume covers the directory rather than the file
# because WAL puts two sidecars beside it.
RUN mkdir -p /data && chown node:node /data
USER node

EXPOSE 3000

# Declared here rather than in compose, so `docker run` gets it too and
# `compose up --wait` honours it either way. Node's global `fetch` rather than
# curl, which `node:*-slim` does not ship and which would cost an apt layer to
# add. Failures inside `--start-period` do not count toward `--retries`, so a
# first-boot seed of 25,000 users does not mark the container unhealthy;
# `--start-interval` is what makes a warm boot flip healthy in ~2s.
HEALTHCHECK --interval=10s --timeout=3s --start-period=90s --start-interval=2s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Never `pnpm start`: pnpm 11's `verifyDepsBeforeRun: install` default would
# attempt a full workspace install at container boot — registry access to start
# a container, against a `node_modules` that was pruned to production on
# purpose. Run node directly.
CMD ["node", "dist/index.js"]
