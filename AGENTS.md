# Presight Exercise — architecture

Searchable user directory. Express + SQLite API, React client, shared zod schema.

## Toolchain

|               |                                                                     |
| ------------- | ------------------------------------------------------------------- |
| Node          | **>= 26** — required: `node:sqlite` and native TypeScript execution |
| pnpm          | **11.8.0** — `corepack enable`                                      |
| Task runner   | nx (`nx.json`: `build.dependsOn: ["^build"]`)                       |
| Lint / format | oxlint / oxfmt                                                      |

## Packages (`apps/*`)

| Package            | Role                                                             | Builds?            |
| ------------------ | ---------------------------------------------------------------- | ------------------ |
| `@presight/schema` | zod schemas + inferred types, the contract between the other two | **Yes** → `dist/`  |
| `@presight/server` | Express API over SQLite                                          | **No** — see below |
| `@presight/client` | React + Vite SPA                                                 | **Yes** → `dist/`  |

`@presight/schema` is consumed as a live symlink, so rebuilding it is immediately visible to the
other two. Its `dist/` must exist before they typecheck — nx handles the ordering.

## Dev

```bash
pnpm install
pnpm --filter=@presight/server init:dev      # writes .env, seeds SQLite
pnpm --filter=@presight/schema build         # once, before the others typecheck

pnpm --filter=@presight/server dev           # :3000
pnpm --filter=@presight/client dev           # :5175
```

The client calls the relative path `/api`; Vite proxies it to the server, nginx does the same in
the container. Same-origin, so **CORS is not involved**.

## Build

```bash
pnpm exec nx build @presight/client    # builds schema first, via ^build
pnpm -r build                          # schema + client only
```

`pnpm exec nx <target> <project>` or `nx run <project>:<target>`. Bare `nx <project>:<target>`
fails — nx reads the first argument as a target name.

## Why the server has no build step

Node 26 strips TypeScript types natively, so the server runs its source directly
(`node src/index.ts`) in development _and_ in the container. There is nothing to transpile. The
Docker image ships the `.ts` files via `pnpm deploy --prod` rather than a bundle.

`apps/server/build.js` and the `esbuild` devDependency are leftovers from the removed step.

## Docker

Single root `Dockerfile`, two targets: `pseserver` (node, :3030) and `pseclient` (nginx, :8086,
proxies `/api`). `docker compose up --build`. Details in [docs/DOCKER.md](docs/DOCKER.md).

## Gotchas

- Editing `apps/schema` → rebuild it, or dependents compile against the previous `dist/`.
- New dependency with an install script → add it to `allowBuilds` in `pnpm-workspace.yaml`.
  Leaving it unresolved makes `pnpm install` **exit 1**, which breaks the Docker build.
- zustand v5 has no automatic shallow compare: object-returning selectors must use `useShallow`.
