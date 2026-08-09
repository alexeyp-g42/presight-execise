# Local development

Running the two apps from source, with hot reload. If you only want to see the app running, the
Docker route in the [README](../README.md#quick-start-with-docker) needs no Node or pnpm at all.

## Requirements

| Tool | Version    | Notes                                                           |
| ---- | ---------- | --------------------------------------------------------------- |
| Node | **>= 26**  | Uses the built-in `node:sqlite` and native TypeScript execution |
| pnpm | **11.8.0** | `corepack enable` picks the right version up automatically      |
| nx   | 23.x       | Task runner; `nx.json` sets `build.dependsOn: ["^build"]`       |

The server runs `.ts` files directly and has **no build step at all** — see
[Why the server never builds](WORKSPACE.md#why-the-server-never-builds).

## Getting started

```bash
pnpm install

# creates apps/server/.env from .env.example and seeds the SQLite database
pnpx nx init:dev @presight/server
```

Then run the two apps in separate terminals:

```bash
pnpx nx dev @presight/server     # http://localhost:3000
pnpx nx dev @presight/client     # http://localhost:5175
```

Open <http://localhost:5175>.

Both `dev` targets declare `dependsOn: ["^build"]` in `nx.json`, so nx builds `@presight/schema`
first — there is no separate step to remember.

The client requests the relative path `/api`, which Vite proxies to the server. Both apps are
therefore one origin as far as the browser is concerned — no CORS, and no URL to keep in sync. If
port 3000 is taken, point the proxy elsewhere:

```bash
API_PROXY_TARGET=http://localhost:3000 pnpx nx dev @presight/client
```

---

Per-package scripts, environment variables and the API reference live in the
[README](../README.md#scripts).
