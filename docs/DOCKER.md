# Docker deployment

Everything builds from the single root [`Dockerfile`](../Dockerfile). It is multi-stage with two
publishable targets:

| Target      | Base           | Contains                                     | Listens on | Size   |
| ----------- | -------------- | -------------------------------------------- | ---------- | ------ |
| `pseserver` | `node:26-slim` | Express API + SQLite database                | `3030`     | ~277MB |
| `pseclient` | `nginx:alpine` | The client's static `dist/`, served by nginx | `8086`     | ~65MB  |

The shared `app-build` stage runs `pnpm exec nx build @presight/client`, which builds
`@presight/schema` first because `nx.json` declares `build.dependsOn: ["^build"]` — the same task
graph used locally. `NX_DAEMON=false` keeps nx from starting a background daemon in the image.

The server is never built: Node 26 runs its TypeScript directly, so
`pnpm --filter=@presight/server --prod deploy` copies the source plus production-only dependencies
into a self-contained tree — no monorepo, no pnpm, no bundler at runtime.

**The database is baked into the image.** The build seeds `data/user_data.db` from the committed
`user_data.csv` via `init:prod`, so the server image ships with a known-good 1,000-user dataset and
needs no volume, no init container, and no external database.

---

## How the two containers talk

nginx serves the client **and** reverse-proxies `/api` to the server:

```
browser ──► nginx :8086 ──┬── /            static assets
                          └── /api/*  ───► server :3030   (/api prefix stripped)
```

Two consequences worth understanding, because they are why the setup is configured the way it is:

- **The browser only ever talks to one origin**, so there are no cross-origin requests and
  **CORS is not involved at all**. The server's `CORS_ORIGIN` is irrelevant to this deployment.
- **Nothing about the deployment is compiled into the client bundle.** It requests the relative
  path `/api`, so the same image runs in dev, staging and production unchanged. There are
  deliberately **no `VITE_*` build arguments**.

The API address is a _runtime_ setting (`API_UPSTREAM`) read by nginx when the container starts —
which is exactly the flexibility a Vite bundle cannot have, since Vite inlines `import.meta.env` at
build time.

---

## Quick start

```bash
# first time (or after changing code) — builds the images, then starts detached
docker compose up --build -d

# subsequent times — reuses the existing images, starts detached
docker compose up -d
```

- Client → <http://localhost:8086>
- API through the proxy → <http://localhost:8086/api/hobbies>
- API directly (debugging only) → <http://localhost:3030>

Dropping `-d` runs attached instead, streaming both containers' logs until you stop it with
`Ctrl+C` — useful while debugging, but it blocks the terminal. With `-d`, use
`docker compose logs -f` to reattach to the logs on demand.

Tear down with `docker compose down`.

If either port is taken, override it. **No rebuild is needed** — ports are runtime-only:

```bash
WEB_PORT=8090 API_PORT=3031 docker compose up
```

| Variable      | Default | What it controls                                   |
| ------------- | ------- | -------------------------------------------------- |
| `WEB_PORT`    | `8086`  | Host port the client is served on                  |
| `API_PORT`    | `3030`  | Host port the API is published on (debugging only) |
| `SERVER_PORT` | `3030`  | Port the API listens on **inside** the container   |

`SERVER_PORT` is the interesting one: a single value feeds the server's `PORT`, the container side
of the published mapping, and the client's `API_UPSTREAM`, so nginx always proxies to wherever the
server actually is.

```bash
SERVER_PORT=4300 API_PORT=4301 WEB_PORT=8086 docker compose up -d
#   -> nginx renders  proxy_pass http://server:4300/;
```

---

## Environment variables

### Client image — runtime

| Variable                | Default in image | Purpose                                                             |
| ----------------------- | ---------------- | ------------------------------------------------------------------- |
| `API_UPSTREAM`          | `server:3030`    | `host:port` nginx proxies `/api` to. Resolved on the Docker network |
| `NGINX_ENVSUBST_FILTER` | `^API_UPSTREAM$` | Restricts substitution so nginx's own `$host` etc. survive          |

Unlike `VITE_API_BASE_URL`, `API_UPSTREAM` is resolved **by nginx inside the network**, not by the
browser. A compose service name such as `server:3030` is correct here — and is what you want.

### Client image — build arguments

None. That is the point of this design.

`NODE_IMAGE` (`node:26-slim`) and `PNPM_VERSION` (`11.8.0`) exist on the shared base stage for
reproducibility, but nothing environment-specific is baked in.

### Server image — build argument

| Argument      | Default | Purpose                                                    |
| ------------- | ------- | ---------------------------------------------------------- |
| `SERVER_PORT` | `3030`  | Sets both `ENV PORT` and `EXPOSE`, so the two cannot drift |

Only the _default_ is baked in — `docker run -e PORT=4200` still wins at run time. The build arg
exists so the `EXPOSE` metadata matches whatever port the image actually listens on.

### Server image — runtime

| Variable        | Default in image        | Purpose                                                                                                          |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`      | `production`            | Set by the Dockerfile                                                                                            |
| `PORT`          | `3030`                  | Port the API listens on inside the container. Defaults from the `SERVER_PORT` build arg, overridable at run time |
| `DATABASE_FILE` | `data/user_data.db`     | SQLite file, relative to the app root. Baked in at build time                                                    |
| `CORS_ORIGIN`   | `http://localhost:5175` | **Not used in this topology.** Only matters if a browser calls this port directly instead of going through nginx |

---

## Building and running without compose

```bash
# Server — on a shared network so the client can resolve it by name
docker network create presight
docker build --target pseserver -t presight-server .
docker run -d --name server --network presight presight-server

# Client — no build args, ever
docker build --target pseclient -t presight-client .
docker run -d --network presight -p 8086:8086 \
  -e API_UPSTREAM=server:3030 \
  presight-client
```

### Deploying to a real host

The same two images, unmodified. Only `API_UPSTREAM` changes, and only if the API moves:

```bash
docker run -d -p 8086:8086 -e API_UPSTREAM=api.internal:3030 presight-client
```

Because the client is origin-agnostic, putting it behind a TLS terminator or an ingress needs no
rebuild — serve it at any hostname and `/api` follows along.

---

## Verifying locally

With the stack up, these are the checks worth running. Substitute your ports.

```bash
# 1. containers are up
docker compose ps

# 2. nginx rendered the template with the runtime upstream
docker compose exec client grep -A1 'location /api/' /etc/nginx/conf.d/default.conf
#   -> proxy_pass http://server:3030/;

# 3. the API answers through the proxy, same origin as the client
curl -o /dev/null -w '%{http_code}\n' http://localhost:8086/api/hobbies         # 200, 30 items
curl -o /dev/null -w '%{http_code}\n' http://localhost:8086/api/nationalities   # 200, 51 items
curl -s "http://localhost:8086/api/users?pagesize=1" | head -c 300

# 4. query strings survive the prefix strip
curl -s "http://localhost:8086/api/users?first_name=sa&orderby=age&sort=desc&pagesize=3"
#   -> 191 total, ages descending

# 5. the database really is inside the image
docker compose exec server ls -la data/
#   -> user_data.db, ~880 KB

# 6. no absolute API origin is compiled into the bundle
docker compose exec client sh -c \
  "grep -ohE 'https?://[a-zA-Z0-9.:-]+' /usr/share/nginx/html/assets/*.js | sort -u"
#   -> only library/doc URLs (json-schema.org, react.dev, ...). If a localhost or
#      environment hostname appears here, something reintroduced a VITE_API_BASE_URL.

# 7. nginx serves the SPA with sane caching
curl -sD- -o /dev/null http://localhost:8086/index.html | grep -i cache-control
#   -> no-store  (else a redeploy serves links to deleted asset hashes)
curl -sD- -o /dev/null http://localhost:8086/assets/<hashed>.js | grep -i cache-control
#   -> public, immutable
```

Then open the client and confirm the list loads, filters apply, and the URL updates as you filter.

```bash
docker compose logs -f server
```

---

## Troubleshooting

**`Bind for 0.0.0.0:8086 failed: port is already allocated`**
Find the holder with `docker ps --format 'table {{.Names}}\t{{.Ports}}'`, then stop it or set
`WEB_PORT`/`API_PORT`. No rebuild required.

**`502 Bad Gateway` on `/api/*`**
nginx cannot reach the server. Check `API_UPSTREAM` matches the server's service name and internal
port, that both containers share a network, and that the server is actually up
(`docker compose logs server`).

**`404` on `/api/*` but the server is healthy**
The prefix strip depends on the trailing slash in `proxy_pass http://${API_UPSTREAM}/;`. Remove
that slash and nginx forwards `/api/users` verbatim, which the server does not serve.

**Client shows a blank page**
Check `docker compose logs client`. If nginx is fine, the `app-build` stage likely produced an
empty `dist/`; rebuild with `--progress=plain --no-cache` and read the client build step.

**Schema changes are not reflected**
`@presight/schema` is resolved through a symlink inside the image (verified: the client's
`node_modules/@presight/schema` is a link to `apps/schema`), so nx building it is enough. If you
replace the nx call with a direct client build, schema will not be built first and the client will
fail to typecheck.

**`ERR_PNPM_IGNORED_BUILDS` during `RUN pnpm install`**
A dependency with an install script is unresolved in `allowBuilds`. `pnpm install` exits 1 in that
state, so the image build fails. Fix it in `pnpm-workspace.yaml`, not in the Dockerfile.

---

## Notes on the image design

- **No volumes.** The dataset is immutable and baked in. To ship different data, regenerate
  `user_data.csv` with `pnpm --filter=@presight/server data:create-fresh`, commit it, and rebuild.
- **The server runs TypeScript directly** (`node src/index.ts`) — Node 26 strips types natively, so
  there is no transpile step in the final stage.
- **pnpm is pinned** through corepack rather than floating, so a build today and a build in six
  months resolve the same package manager.
- **`.dockerignore` excludes `apps/server/data/`**, so a local development database is never copied
  into the image — it is always rebuilt from the CSV.
- **Publishing the API port is optional.** The client does not use it; it exists so you can curl the
  API while debugging. Drop the `ports:` entry on `server` to keep it internal.
